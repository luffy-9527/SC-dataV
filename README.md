# sc-datav Vue3 智慧城市数据大屏

基于 `sc-datav` 项目迁移改造的 Vue3 版本数据可视化大屏。项目使用 **Vue 3 + TypeScript + Vite + Pinia + Vue Router + Three.js / TresJS + ECharts** 技术栈，重点保留并优化了 Demo1 的四川省智慧城市数据大屏效果，包括三维地图、地形纹理、热力图、行政区 hover 上浮、点击下钻、天气系统、图表面板、底部控制按钮等功能。

> 当前版本重点优化 Demo1。Demo0、Demo2、Demo3 如仍为迁移占位页，需要继续按 Vue SFC 方式逐步迁移业务组件。

---

## 项目预览

默认访问地址：

```bash
http://localhost:5173/sc-datav/#/demo1
```

主要页面：

```t
/        首页
/demo0   Demo0 页面
/demo1   四川省智慧城市数据大屏
/demo2   Demo2 页面
/demo3   Demo3 页面
```

---

## 技术栈

```txt
Vue 3
TypeScript
Vite
Vue Router
Pinia
Three.js
TresJS
ECharts
D3-geo
GSAP
TopoJSON
SCSS / CSS
```

---

## 核心功能

### Demo1 四川省智慧城市大屏

* 四川省三维地形地图
* 卫星 / 地形风格贴图
* 行政区边界线
* 行政区 hover 整体上浮
* hover Tooltip 数据提示
* 城市数据柱状光束
* 热力图覆盖层
* 底部旋转能量环
* 云层 / 天气系统
* 左右六块数据面板
* 底部功能按钮控制
* 点击行政区下钻到二级地图
* 返回四川省地图
* 鼠标拖拽、旋转、缩放查看地图

### 地图下钻

点击省级地图中的地市州行政区，例如：

```txt
成都市
绵阳市
德阳市
乐山市
南充市
宜宾市
泸州市
达州市
广元市
```

会进入对应城市的区县级地图。

下钻状态顶部会显示：

```txt
成都市  区县级地图  返回四川省
```

点击“返回四川省”可回到一级地图。

### 天气系统

底部第一个按钮用于切换天气模式。

天气模式包括：

```txt
多云流云
低空雾气
动态降雨
雷暴天气
晴空
```

天气层不会影响地图 hover、点击下钻、拖拽、旋转和缩放。

### 地图交互

默认交互：

```txt
左键拖拽：平移地图
右键拖拽：旋转地图
滚轮：缩放地图
鼠标移入行政区：行政区上浮并显示 Tooltip
点击行政区：进入对应城市二级地图
```

---

## 环境要求

推荐环境：

```txt
Node.js >= 18.16.0
pnpm >= 8
```

查看版本：

```bash
node -v
pnpm -v
```

---

## 安装依赖

```bash
pnpm install
```

如果安装失败，可以先清理旧依赖：

```bash
rmdir /s /q node_modules
del /q pnpm-lock.yaml
pnpm install
```

---

## 本地启动

```bash
pnpm dev
```

如果修改了依赖、Three.js、TresJS、d3-geo 等模块，建议强制刷新 Vite 依赖缓存：

```bash
pnpm dev --force
```

访问：

```bash
http://localhost:5173/sc-datav/#/demo1
```

---

## 构建项目

```bash
pnpm build
```

本地预览构建结果：

```bash
pnpm preview
```

---


## 常见问题

### Vite 报 `504 Outdated Optimize Dep`

例如：

```txt
d3-geo.js net::ERR_ABORTED 504 (Outdated Optimize Dep)
```

处理：

```bash
Ctrl + C
rmdir /s /q node_modules\.vite
pnpm dev --force
```

如果仍然不行：

```bash
rmdir /s /q node_modules
del /q pnpm-lock.yaml
pnpm install
pnpm dev --force
```

也可以在 `vite.config.ts` 中加入：

```ts
optimizeDeps: {
  include: ['d3-geo'],
  force: true,
}
```



---

## 后续优化方向

* 完整迁移 Demo0、Demo2、Demo3
* 二级地图改为本地 GeoJSON，避免外网依赖
* 天气系统增加真实数据驱动
* 行政区下钻增加返回上一级面包屑
* 图表数据改为接口请求
* 增加主题切换
* 增加大屏截图导出
* 增加移动端适配
* 增加生产环境性能优化

---

## 备注

本项目由原 React 技术栈迁移到 Vue3 技术栈。迁移后的核心目标是：

```txt
功能尽量保持不变
页面视觉尽量接近原版
Demo1 地图效果继续增强
代码结构更符合 Vue3 项目规范
```

::: 
"# dataV"  
"# dataV"  
## 🚀 CI/CD 自动化部署验证通过
