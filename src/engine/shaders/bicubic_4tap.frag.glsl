#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uField;
uniform float uMin;
uniform float uMax;
out vec4 outColor;

// cubic B-spline 权重
vec4 bspline(float t) {
  float t2 = t * t, t3 = t2 * t;
  return vec4(
    (1.0 - 3.0 * t + 3.0 * t2 - t3) / 6.0,
    (4.0 - 6.0 * t2 + 3.0 * t3) / 6.0,
    (1.0 + 3.0 * t + 3.0 * t2 - 3.0 * t3) / 6.0,
    t3 / 6.0
  );
}

float sampleBicubic(vec2 uv) {
  vec2 size = vec2(textureSize(uField, 0));
  vec2 px = uv * size - 0.5;
  vec2 f = fract(px);
  px -= f;

  vec4 wx = bspline(f.x), wy = bspline(f.y);
  vec2 s0 = vec2(wx.x + wx.y, wy.x + wy.y);
  vec2 s1 = vec2(wx.z + wx.w, wy.z + wy.w);
  // 把相邻两点合成一次线性采样的偏移
  vec2 o0 = (px - 0.5 + vec2(wx.y, wy.y) / s0) / size;
  vec2 o1 = (px + 1.5 + vec2(wx.w, wy.w) / s1) / size;

  float a = texture(uField, vec2(o0.x, o0.y)).r;
  float b = texture(uField, vec2(o1.x, o0.y)).r;
  float c = texture(uField, vec2(o0.x, o1.y)).r;
  float d = texture(uField, vec2(o1.x, o1.y)).r;

  float sx = s0.x / (s0.x + s1.x);
  float sy = s0.y / (s0.y + s1.y);
  return mix(mix(d, c, sx), mix(b, a, sx), sy);
}

// 先凑合一个色带，后面换 LUT 纹理
vec3 ramp(float t) {
  const vec3 c0 = vec3(0.19, 0.07, 0.48);
  const vec3 c1 = vec3(0.10, 0.55, 0.85);
  const vec3 c2 = vec3(0.45, 0.85, 0.40);
  const vec3 c3 = vec3(0.98, 0.80, 0.15);
  const vec3 c4 = vec3(0.85, 0.15, 0.10);
  t = clamp(t, 0.0, 1.0) * 4.0;
  if (t < 1.0) return mix(c0, c1, t);
  if (t < 2.0) return mix(c1, c2, t - 1.0);
  if (t < 3.0) return mix(c2, c3, t - 2.0);
  return mix(c3, c4, t - 3.0);
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float v = sampleBicubic(uv);
  if (v < uMin - 1.0) {  // 碰到缺测就透明，边缘会有点毛，先这样
    outColor = vec4(0.0);
    return;
  }
  outColor = vec4(ramp((v - uMin) / (uMax - uMin)), 1.0);
}
