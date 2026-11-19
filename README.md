# meteo-webgl2-mvp

WebGL2 气象网格渲染，目前还是很早期的雏形。

思路：后端把浮点场压成 RGBA PNG 瓦片（24bit 编码，A 当掩码），前端两个 pass：

1. 把 PNG 解包成 R32F 纹理
2. 4 次 texture() 采样做 bicubic（B-spline），再查色带

## 跑起来

```
pip install -r backend/requirements.txt
python backend/generate_mock_data.py
python backend/tile_pipeline.py
npm install
npm run dev
```

测试（还没稳定，baseline 第一次跑会自动生成）：

```
npx playwright test
```

## TODO

- [ ] 多瓦片拼接，现在只画 0/0/0
- [ ] 半浮点降级路径没在真机上测过
- [ ] LUT 改成纹理
- [ ] context restore 之后瓦片要重新拉
