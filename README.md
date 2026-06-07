# Tech Stress Interviewer · 高压技术面试模拟器

> PROTOYPE v2.0.0 · PKU MLIC CHALLENGE 2026

一个基于 Next.js 16 + DeepSeek 大模型的全栈 AI 模拟面试平台。系统会扮演资深技术面试官，根据候选人上传的简历、目标岗位与压力等级发起多轮技术拷问，并对作答进行结构化打分、生成可视化复盘报告并支持一键导出 PDF。

---

## 项目简介

Tech Stress Interviewer 致力于解决求职者/保研/科研面试备战中的核心痛点：**缺乏高压、即时反馈的实战模拟**。

核心能力：

- **多场景面试模板**：内置字节后端开发一面、北大 CS 夏令营学术面试、微软亚研院 NLP 研究员面试三套模板，也支持完全自定义公司 + 岗位。
- **简历解析与匹配度审阅**：支持上传 PDF / DOCX / TXT 简历（`mammoth` + `pdf-parse`），AI 会根据目标岗位进行匹配度审阅与"跨界"硬伤指正。
- **双轨追问机制**：系统采用「主话题轮次 + 深入追问」双轨控制，在固定题量内对候选人持续施压并向下挖掘。
- **高保真实时交互**：
  - 浏览器内调用摄像头进行仪态自检（`CameraMonitor`）。
  - 支持语音作答：MediaRecorder 录音 → 硅基流动 ASR 转写 → 文本回填。
  - 面试官语音播报：基于 Microsoft Edge TTS（`edge-tts-universal`）。
- **结构化复盘报告**：`/api/chat` 严格返回 JSON 五维评分（技术深度 / STAR 结构 / 抗压能力 / 问题解决 / 沟通表达），支持一键导出 PDF（`html2canvas-pro` + `jspdf`）。
- **抗注入安全护栏**：Prompt 内置防 Prompt Injection 与角色越权机制，将简历与自定义背景严格视为只读数据。

---

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | [Next.js 16.2.7](https://nextjs.org/) (App Router, Turbopack) |
| UI 库 | React 19.2.4 + TypeScript 5 |
| 样式 | Tailwind CSS 4 (`@tailwindcss/postcss`) |
| 大模型 | DeepSeek Chat（通过 OpenAI 兼容协议） |
| 语音合成 | `edge-tts-universal` (Microsoft Edge TTS · zh-CN-YunxiNeural) |
| 语音识别 | 硅基流动 `TeleAI/TeleSpeechASR`（通过 OpenAI Whisper 兼容协议） |
| 文件解析 | `pdf-parse` · `mammoth` |
| 报告导出 | `html2canvas-pro` · `jspdf` |
| 图标 | `lucide-react` |
| 代码规范 | ESLint 9 + `eslint-config-next` |

---

## 项目结构

```
tech-stress-interviewer/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # 面试对话 / 报告生成（DeepSeek）
│   │   ├── parse-resume/route.ts  # 简历解析（PDF / DOCX / TXT）
│   │   ├── transcribe/route.ts    # 语音转写（硅基流动 ASR）
│   │   └── tts/route.ts           # 面试官语音播报（Edge TTS）
│   ├── components/
│   │   ├── InterviewSetup.tsx     # 面试配置向导（两步式）
│   │   ├── InterviewRoom.tsx      # 面试主界面（语音/文本/计时）
│   │   ├── CameraMonitor.tsx      # 摄像头仪态自检
│   │   ├── Timer.tsx              # 单题倒计时
│   │   └── ReportCard.tsx         # 复盘报告 + PDF 导出
│   ├── globals.css                # Tailwind 入口
│   ├── layout.tsx                 # 根布局
│   └── page.tsx                   # 三步流程编排（setup → interview → report）
├── public/                        # 静态资源
├── test/data/                     # 简历样例数据
├── AGENTS.md                      # Next.js 16 注意事项
└── package.json
```

---

## 快速开始

### 1. 环境要求

- **Node.js** ≥ 20（推荐 20 LTS）
- **npm** ≥ 10（或 pnpm / yarn / bun 任选）
- 现代浏览器（需要 `getUserMedia` 与 `MediaRecorder` 支持，建议 Chrome / Edge 最新版）

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

在项目根目录新建 `.env.local`，填入以下密钥：

```env
# DeepSeek 大模型（对话与报告生成）
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 硅基流动（语音转写 ASR）
SILICONFLOW_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ `.env*` 已在 `.gitignore` 中忽略，**请勿将密钥提交到仓库**。

### 4. 启动开发服务器

```bash
npm run dev
```

默认监听 [http://localhost:3000](http://localhost:3000)。

### 5. 浏览器权限授权

进入面试间首次使用时会请求：

- 摄像头权限（仪态自检，可拒绝）
- 麦克风权限（语音作答，可拒绝 — 拒绝后只能文本输入）

权限偏好会写入 `localStorage`（`pref_camera` / `pref_mic`）以便下次自动恢复。

---

## 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（Turbopack 热更新） |
| `npm run build` | 生产环境构建 |
| `npm run start` | 启动生产服务器（需先 `build`） |
| `npm run lint` | 运行 ESLint 代码检查 |

---

## 核心流程

```
┌─────────────┐   1.选择模板/岗位/压力等级    ┌──────────────┐
│ InterviewSetup├────────────────────────────►│ InterviewRoom│
│ (向导 2 步)   │  2.上传简历+授权音视频      │ (高压对线)    │
└──────┬───────┘                              └──────┬───────┘
       │                                              │
       │◄──────────── 重新开始 ◄────────────┐  答题/追问/计时
       │                                    │
       │                              ┌─────▼─────┐
       └──────────────────────────────┤ ReportCard │
              5.查看复盘 + 导出 PDF     └───────────┘
```

1. **Setup**：选择模板（字节后端 / 北大保研 / 微软亚研 / 自定义）→ 上传简历 → 授权摄像头与麦克风。
2. **Interview**：系统按题量生成首题 → 候选人可文本或语音作答 → AI 追问直到本话题结束 → 进入下一话题。
3. **Report**：AI 生成五维评分与改进建议 → 支持一键重试 / 导出 PDF / 重新开始。

---

## 接口约定（后端 Route Handlers）

| 路由 | 方法 | 用途 |
| --- | --- | --- |
| `/api/chat` | `POST` | 与 DeepSeek 对话（追问 / 报告生成）。当 `isFinish=true` 时返回结构化 `ReportData` JSON。 |
| `/api/parse-resume` | `POST` | 解析上传的简历文件，返回纯文本。 |
| `/api/transcribe` | `POST` | 接收 WebM 音频，调用硅基流动 ASR 返回文本。 |
| `/api/tts` | `POST` | 接收文本，返回 MP3 音频流（带 5 次自动重试）。 |

---

## 关键设计点

- **鲁棒 JSON 解析**：`safeParseJson` 会尝试剥离 Markdown 代码块、正则提取最外层 `{}`，避免模型偶发格式错误导致前端崩溃。
- **TTS 抗网络抖动**：`edge-tts-universal` 每次重试都重新实例化，杜绝 WebSocket 连接复用污染，并在合成前清洗括号/星号等非语音字符。
- **重试无损复盘**：`page.tsx` 暂存最终对话历史、满意度与超时次数，网络异常时进入兜底 Report，可一键重试而不丢失作答数据。
- **抗注入护栏**：Prompt 中明确禁止执行简历 / 自定义背景内的指令，并要求识别"跨界硬伤"以提升考察深度。

---

## 注意事项

- 项目使用的 Next.js 为 **16.x**，与训练数据中的早期版本存在破坏性变更，提交代码前请阅读 `node_modules/next/dist/docs/` 中的相关指南（详见 `AGENTS.md`）。
- 浏览器需在 **HTTPS 或 localhost** 环境下才能使用 `getUserMedia` API。
- 麦克风采集的 WebM 编码与浏览器实现相关，建议在主流 Chromium 内核浏览器中使用以获得最佳兼容性。

---

## License

MIT
