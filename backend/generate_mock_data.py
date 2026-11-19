import os
import numpy as np

# 假数据：梯度 + 两个涡旋，够看插值效果就行
N = 512
OUT = os.path.join(os.path.dirname(__file__), "mock.npz")

y, x = np.mgrid[0:N, 0:N] / N
temp = 260 + 40 * y
for cx, cy, s in [(0.3, 0.4, 12), (0.7, 0.65, -9)]:
    r2 = (x - cx) ** 2 + (y - cy) ** 2
    temp += s * np.exp(-r2 / 0.01) * np.cos(np.arctan2(y - cy, x - cx) * 3 + r2 * 40)

# 挖个洞当缺测
temp[40:70, 400:460] = np.nan

np.savez(OUT, temp=temp.astype(np.float32))
print("wrote", OUT, temp.shape)
