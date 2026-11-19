import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
OUT_DIR = os.path.join(HERE, "..", "public", "tiles")
TILE = 256


def load(path=None, var=None):
    if path:
        import xarray as xr
        engine = "cfgrib" if path.endswith((".grib", ".grib2", ".grb2")) else None
        ds = xr.open_dataset(path, engine=engine)
        var = var or list(ds.data_vars)[0]
        return ds[var].values.squeeze().astype(np.float32)
    return np.load(os.path.join(HERE, "mock.npz"))["temp"]


def encode(arr, vmin, vmax):
    # 24bit 打进 RGB，A=255 有效 / 0 缺测
    valid = ~np.isnan(arr)
    n = np.where(valid, (arr - vmin) / (vmax - vmin), 0.0)
    q = np.round(np.clip(n, 0, 1) * 0xFFFFFF).astype(np.uint32)
    rgba = np.zeros(arr.shape + (4,), np.uint8)
    rgba[..., 0] = q >> 16
    rgba[..., 1] = (q >> 8) & 0xFF
    rgba[..., 2] = q & 0xFF
    rgba[..., 3] = valid * 255
    return rgba


def resize(arr, size):
    # 最近邻缩，低层级凑合用
    h, w = arr.shape
    yi = (np.arange(size) * h / size).astype(int)
    xi = (np.arange(size) * w / size).astype(int)
    return arr[yi][:, xi]


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else None
    data = load(path)
    vmin, vmax = float(np.nanmin(data)), float(np.nanmax(data))
    max_z = max(0, int(np.ceil(np.log2(max(data.shape) / TILE))))

    for z in range(max_z + 1):
        n = 2 ** z
        level = resize(data, TILE * n)
        for ty in range(n):
            for tx in range(n):
                part = level[ty * TILE:(ty + 1) * TILE, tx * TILE:(tx + 1) * TILE]
                d = os.path.join(OUT_DIR, str(z), str(tx))
                os.makedirs(d, exist_ok=True)
                Image.fromarray(encode(part, vmin, vmax), "RGBA").save(os.path.join(d, f"{ty}.png"))

    meta = {"min_val": vmin, "max_val": vmax, "tile_size": TILE, "max_zoom": max_z, "variable": "temp", "unit": "K"}
    with open(os.path.join(OUT_DIR, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print("tiles ->", os.path.abspath(OUT_DIR), meta)


if __name__ == "__main__":
    main()
