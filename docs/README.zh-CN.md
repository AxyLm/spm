# SPM (Skill Package Manager)

SPM 是一个本地 **Skill 包管理器**，用于在当前项目中管理技能文件。它主要负责：

- 解析 Skill 来源（GitHub、skills.sh）
- 克隆对应的 Git 仓库，提取 Skill 子目录
- 将 Skill 安装到 `.agents/skills/`
- 维护 `skills.json`

---

## 功能

- 支持多种来源的 Skill 安装：
  - GitHub 仓库 / 子目录
  - GitHub `tree` / `blob` URL（包括指向 `SKILL.md` 的链接）
  - [skills.sh](https://skills.sh) 技能页面
- 将技能内容复制到 `.agents/skills/<name>/`
- 使用 `skills.json` 记录安装信息
- 提供 `install` / `remove` / `update` / `list` 四个子命令
- 使用 tsdown 构建，使用 vitest 进行测试

---

## 安装与构建

在 `spm/` 目录中执行：

```bash
cd spm
npm install
```

构建 CLI：

```bash
npm run build
```

运行：

```bash
node dist/cli.mjs --help
# 或者如果通过 npm link 安装：
spm --help
```

`package.json` 中 `bin` 默认为：

```jsonc
"bin": {
  "spm": "./dist/cli.mjs"
}
```

---

## 命令说明

### 安装 Skill

在项目根目录执行：

```bash
# GitHub repo
spm install vercel-labs/agent-skills

# GitHub tree 子目录
spm install https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices

# GitHub blob 文件（自动使用父目录作为 subdir）
spm install https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md

# skills.sh
spm install https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices

```

安装过程会：

1. 将来源解析为 `repo` / `subdir` / `ref`
2. 通过 `git clone` 获取仓库并提取子目录
3. 将内容复制到 `.agents/skills/<name>/`
4. 更新 `skills.json`

---

### 列出技能

```bash
spm list
```

示例输出：

```text
Installed skills (1):

  react-best-practices  https://github.com/vercel-labs/agent-skills (skills/react-best-practices)  @5847a7c
```

---

### 移除技能

```bash
spm remove react-best-practices
```

操作步骤：

1. 读取 `skills.json`
2. 删除 `.agents/skills/<name>/`
3. 更新 `skills.json` 中的条目

---

### 更新技能

```bash
spm update react-best-practices
```

操作步骤：

1. 从 `skills.json` 读取 `source` / `subdir` / `ref`
2. 重新克隆仓库并提取对应子目录
3. 替换 `.agents/skills/<name>/`
4. 更新 `skills.json` 中的 `commit`

---

## 目录结构示例

安装 Skill 后，项目根目录大致结构：

```text
project/
├─ skills.json
├─ .agents/
│  └─ skills/
│     └─ <name>/               # 安装后的技能目录
```

---

## 技术栈

- 语言：Node.js + TypeScript
- 构建工具：tsdown（目标 Node 20，输出 ESM `dist/cli.mjs`）
- 测试：vitest（URL 解析等逻辑有单元测试）
- 依赖：
  - `commander`：命令行解析
  - `execa`：执行 `git`
  - `fs-extra`：文件与目录操作
