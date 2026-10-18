# SC-dataV · 新一代企业级 3D 数字孪生与全息 AI 数字人大屏系统

<div align="center">

![Vue3](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat-square&logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Three.js](https://img.shields.io/badge/Three.js-r170-000000?style=flat-square&logo=three.js)
![ECharts](https://img.shields.io/badge/ECharts-5.x-AA344D?style=flat-square&logo=apacheecharts)
![Gemini AI](https://img.shields.io/badge/Google-Gemini_AI-4285F4?style=flat-square&logo=google)
![License](https://img.shields.io/badge/License-MIT-green.style=flat-square)

<p align="center">
  <b>融合 WebGL 3D 渲染、工业仿真数字孪生与大语言模型（LLM）的多模态数据可视化中枢</b>
</p>

</div>

---

## 📖 项目简介

**SC-dataV** 是一套面向高端展示与工业决策场景的新一代多维数据大屏系统。项目基于 **Vue 3 + Vite 5 + TypeScript + Three.js + ECharts** 构建，全景整合了智慧政务城市脑图、万米深地工业孪生、自动驾驶智驾座舱以及**初音未来 3D 全息 AI 数字人智能交互舱**四大核心展区。

系统原生支持多模态语音交互（ASR/TTS）、大模型全网实时联网搜索检索增强（Grounding）、三维视点全息运镜、动作律动编排与反控大屏调度能力。

---

## 🌟 四大核心大屏矩阵

```txt
┌────────────────────────────────────────────────────────────────────────┐
│                          SC-dataV 核心大屏矩阵                         │
├─────────────────┬──────────────────┬─────────────────┬─────────────────┤
│  Demo1 智慧城市  │  Demo2 工业油田  │  Demo3 自动驾驶  │ Demo4 AI 数字人 │
│  三维地形与下钻  │ 万米深地勘探孪生 │  高阶智驾座舱   │ 初音未来全息交互│
└─────────────────┴──────────────────┴─────────────────┴─────────────────┘
```

### 1. 🌸 Demo4: 初音未来 · 3D 全息 AI 数字人智能指挥中心
* **3D WebGL 全息数字人**：
  * 基于 Three.js 与 DRACO 几何压缩加载精模虚拟偶像初音未来（Hatsune Miku）；
  * 融合高精骨骼动力学与 67 组面部 BlendShapes / Viseme 表情基，实现音画同步的唇形韵律与丰富拟人表情；
  * 支持才艺律动舞蹈（Rumba、舞台欢呼、舞台Pose）与景深镜头运镜切换（特写/全身/全景舞台）。
* **Gemini 3.5 认知大脑 + 全网实时联网搜索**：
  * 接入 Google Gemini 3.5 Flash 多模态内核，结合维基百科与实时气象接口，实现精准的事实检索与百科解答；
  * 具备大屏反控意图识别标签：根据对话指令自动跳转指定业务大屏或触发声光预警。
* **全息智能对话交互舱（聊天框模式）**：
  * 完整保留多轮对话上下文历史，支持上下滑动追溯对话记录；
  * 气泡集成实时联网信源标签、一键业务跳转胶囊；
  * 支持「一键收起/展开」模式：折叠后完全释放视野，100% 毫无遮挡呈现 3D 舞台；
  * 快捷提问指令横向微动滑轨，支持随心探索。
* **多模态声线调校矩阵**：
  * 搭载专属打造的 6 档初音未来声线预设（官方原声、元气少女、温柔治愈、数智专员、日文歌姬、萌系电波）；
  * 试听声线与语音播报支持一键实时中途打断终止（快捷键 `Esc`），告别机械失真。

### 2. 🏙️ Demo1: 四川省智慧城市数智大脑大屏
* **三维空间地理信息**：四川省三维拔模地形图、卫星底图、行政区边界发光流光线；
* **层级下钻与交互**：鼠标 Hover 行政区整体上浮高亮并显示 Tooltip 指标，点击任意市州（成都市、绵阳市等）无缝下钻至区县级二级地图，支持一键面包屑返回；
* **动态粒子天气系统**：支持一键切换流云、低空雾气、动态降雨、雷暴天气及晴空等 5 种大气气象模拟；
* **环抱式宏观态势面板**：左右 6 块科技感 ECharts 数据面板，呈现全省物联网节点、算力负载与民生指标。

### 3. 🛢️ Demo2: 塔里木万米深地工程工业数字孪生大屏
* **万米地层剖面透视**：纵向穿透地表大漠与万米地底油气岩层，可视化展示深地塔科井的钻探深度与层位；
* **重型工业装备物理联动**：三维重现钻台、井架、游车大钩、液压猫道与排管堆场，联动抽油机游梁往复运动仿真；
* **实时遥测工况矩阵**：50Hz 遥测井口回压、泥浆排量、井底温度与防喷预警。

### 4. 🚗 Demo3: 宝马 M4 自动驾驶智能座舱数字孪生大屏
* **车辆级 PBR 数字孪生**：逼真渲染宝马 M4 运动轿跑，车漆反光、车轮转动与转向联动；
* **感知决策点云仿真**：前方激光雷达多线束扫描线、动态障碍物识别框、TTC（碰撞安全时间）测距预警；
* **领航驾驶辅助系统（NOA）**：高速自主变道超车仿真、高精车道保持与数字化 HUD 仪表盘。

---

## 🛠️ 技术栈

| 领域 | 核心技术 / 库 |
| :--- | :--- |
| **前端基础** | Vue 3.x（Composition API）、TypeScript 5.x、Vite 5.x、Vue Router 4.x、Pinia |
| **3D 引擎与几何处理** | Three.js（r170）、DRACOLoader、GLTFLoader、OrbitControls、TresJS |
| **数据可视化 & GIS** | Apache ECharts 5.x、D3-geo、TopoJSON、GeoJSON |
| **AI 认知与多模态** | Google Gemini 3.5 Flash / Pro、Google Search Grounding |
| **语音智能交互** | Web Speech API（SpeechRecognition + SpeechSynthesis）、Web Audio API |
| **样式与动效** | SCSS / CSS Variables、GSAP 动画库 |

---

## ⚡ 快速开始

### 1. 环境要求
推荐运行环境：
* **Node.js**: `>= 18.16.0`
* **包管理器**: `pnpm >= 8.0.0`

### 2. 获取代码与安装依赖
```bash
# 克隆仓库
git clone https://github.com/luffy-9527/SC-dataV.git
cd SC-dataV

# 安装依赖
pnpm install
```

### 3. 配置大模型 API 密钥（可选）
数字人 Demo4 内置了高保真离线专家知识库兜底。如需体验全网实时联网搜索，请配置 Gemini API Key：
```bash
# 复制环境变量模板
cp .env.example .env.local
```
在 `.env.local` 中填入您的有效 API Key：
```ini
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-3.5-flash
VITE_GEMINI_BASE_URL=https://generativelanguage.googleapis.com
```
> [!TIP]
> 亦可直接在项目运行后，点击 Demo4 页面右上角的「**⚙ 引擎设置**」直接在弹窗中配置 Key 并实时保存到本地缓存中。

### 4. 本地启动
```bash
pnpm dev
```
启动成功后，浏览器访问：
* **Demo4 数字人主入口**：`http://localhost:8888/#/demo4`
* **Demo1 智慧城市**：`http://localhost:8888/#/demo1`
* **Demo2 工业深地油田**：`http://localhost:8888/#/demo2`
* **Demo3 自动驾驶座舱**：`http://localhost:8888/#/demo3`

### 5. 生产构建
```bash
# 静态资源打包
pnpm build

# 本地预览打包产物
pnpm preview
```

---

## 📂 项目结构

```txt
SC-dataV/
├── public/
│   └── models/               # 3D GLB 模型资源（初音未来、骨骼动画等）
├── src/
│   ├── assets/               # 地图纹理、材质贴图与静态图片
│   ├── router/               # 统一路由配置（默认重定向至 Demo4）
│   ├── pages/
│   │   ├── Demo1/            # 四川省智慧城市数据大屏
│   │   ├── Demo2/            # 万米深地油田数字孪生大屏
│   │   ├── Demo3/            # 宝马 M4 自动驾驶仿真座舱
│   │   └── Demo4/            # 初音未来 3D 全息 AI 数字人智能指挥中心
│   │       ├── components/
│   │       │   ├── AvatarScene.vue      # 3D WebGL 舞台与模型驱动场景
│   │       │   ├── ChatDock.vue         # 全息多轮对话交互舱与输入控制台
│   │       │   ├── LeftPanel.vue        # 讲解员档案与遥测性能面板
│   │       │   ├── RightPanel.vue       # 知识中枢、运镜与动作调度控制台
│   │       │   ├── SettingsModal.vue    # 声线调校与模型参数设置模态框
│   │       │   └── TopNavBar.vue        # 科技顶栏导航
│   │       └── composables/
│   │           ├── useAIAgent.ts           # Gemini API 对话与联网搜索调度
│   │           ├── useSpeechRecognition.ts # 语音识别麦克风录入 (ASR)
│   │           └── useSpeechSynthesis.ts   # 语音合成与嘴型唇同步 (TTS)
├── .env.example              # 环境变量配置模板
├── package.json              # 依赖与命令配置
├── vite.config.ts            # Vite 构建与服务配置
└── README.md                 # 项目工程文档
```

---

## ❓ 常见问题排查 (FAQ)

### 1. 数字人语音播报没有声音？
* **浏览器自动播放限制**：现代浏览器要求用户必须在网页产生至少一次交互（点击页面任意处）后才允许发声。首次进入请点击任意按钮或发送一条指令。
* **音色选择**：打开右上角「**⚙ 引擎设置**」，点击「**恢复最美默认原声**」或选择系统推荐的自然女声音色（如 `Microsoft Yaoyao` / `Xiaoxiao`）。

### 2. 语音输入（麦克风）无法录音？
* **HTTPS/Localhost**：浏览器 Web Speech API 仅在 `localhost` 或安全加密环境（`https://`）下生效；
* 请确保浏览器地址栏左侧的“麦克风”权限已勾选为“允许”。

### 3. 大模型调用超时或报错？
* 国内部分网络环境下连接 Google Gemini API 需要科学代理；
* 如果未配置 API Key 或网络暂不可达，系统将自动平滑无缝降级至内置的高保真多场景数字孪生问答知识库，不会出现白屏或崩溃。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源，欢迎用于学习研究、学术交流与商业化原型参考。

<div align="center">
  <b>⭐ 如果这个项目对您的数字孪生与 AI 数字人探索有所启发，欢迎点个 Star 支持一下！</b>
</div>
