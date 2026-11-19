#version 300 es
precision highp float;

uniform sampler2D uPacked;
uniform float uMin;
uniform float uMax;

out vec4 outColor;

void main() {
  vec4 c = texelFetch(uPacked, ivec2(gl_FragCoord.xy), 0);
  vec3 b = floor(c.rgb * 255.0 + 0.5);
  float n = (b.r * 65536.0 + b.g * 256.0 + b.b) / 16777215.0;
  // 缺测先写 -1，pass2 再处理
  float v = c.a > 0.5 ? mix(uMin, uMax, n) : -1e9;
  outColor = vec4(v, 0.0, 0.0, 1.0);
}
