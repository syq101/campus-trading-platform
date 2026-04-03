# 校园二手交易平台

大学生软件测试课程项目 - 符合所有验收标准的前后端Web项目

## 项目简介

这是一个简单的校园二手交易平台，包含买家端和卖家端两个系统，实现了完整的商品管理、订单处理和实时通知功能。

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite（轻量级，无需额外安装）
- **前端**: HTML5 + CSS3 + JavaScript（原生）
- **实时通信**: Socket.io
- **版本控制**: Git

## 项目结构

```
软件测试/
├── package.json          # 项目依赖配置
├── server.js             # 后端服务器主文件
├── database.js           # 数据库初始化和连接
├── .gitignore            # Git忽略文件配置
├── README.md             # 项目说明文档
└── public/               # 前端静态文件目录
    ├── buyer.html        # 买家端页面
    └── seller.html       # 卖家端页面
```

## 功能特性

### 1. 前后端数据库完整链路
- ✅ 商品的增删改查（CRUD）操作
- ✅ 数据通过后端API处理后写入数据库
- ✅ 前端实时展示数据库变化

### 2. 多端系统互动
- ✅ 买家端：浏览商品、购买商品
- ✅ 卖家端：管理商品、查看订单
- ✅ 买家下单后，卖家实时收到通知

### 3. 实时通知
- ✅ 使用Socket.io实现WebSocket实时通信
- ✅ 买家下单后，卖家立即收到弹窗和消息通知
- ✅ 通知计数自动更新

## 快速开始

### 环境要求

- Node.js (建议 v14 或更高版本)
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 启动项目

```bash
npm start
```

或者使用开发模式（需要安装nodemon）：

```bash
npm run dev
```

### 访问系统

启动成功后，在浏览器中访问：

- **买家端**: http://localhost:3000/buyer.html
- **卖家端**: http://localhost:3000/seller.html

## 测试验收

### 验收标准1：数据CRUD操作

在**卖家端**（seller.html）测试：
1. 添加商品：填写商品信息并点击"添加商品"
2. 编辑商品：点击"编辑"按钮修改商品信息
3. 删除商品：点击"删除"按钮删除商品
4. 查看数据库变化：操作后刷新页面验证数据持久化

### 验收标准2：多端互动

测试步骤：
1. 打开两个浏览器窗口/标签页
2. 一个窗口访问买家端（http://localhost:3000/buyer.html）
3. 另一个窗口访问卖家端（http://localhost:3000/seller.html），确保卖家昵称是 `seller1`
4. 在买家端点击某个商品的"立即购买"
5. 观察卖家端是否立即收到订单通知和弹窗

### 验收标准3：Git提交记录

团队成员分工建议（每人负责一部分）：

**成员1（后端开发）**：
- 实现 `server.js` 中的API接口
- 实现 `database.js` 数据库设计

**成员2（买家端开发）**：
- 实现 `public/buyer.html` 页面
- 商品浏览和购买功能

**成员3（卖家端开发）**：
- 实现 `public/seller.html` 页面
- 商品管理和订单通知功能

**成员4（文档和测试）**：
- 编写 `README.md` 和测试文档
- 进行系统集成测试

## Git协作流程

1. 创建GitHub仓库
2. 克隆仓库到本地：`git clone <仓库地址>`
3. 每个成员创建自己的分支：`git checkout -b feature/xxx`
4. 提交代码：`git add . && git commit -m "描述你的修改"`
5. 推送到远程：`git push origin feature/xxx`
6. 创建Pull Request进行代码审查
7. 合并到主分支

## 数据库表结构

### products（商品表）
- id: 商品ID（主键）
- name: 商品名称
- price: 商品价格
- description: 商品描述
- seller: 卖家昵称
- status: 状态（available/sold）
- created_at: 创建时间

### orders（订单表）
- id: 订单ID（主键）
- product_id: 商品ID（外键）
- buyer: 买家昵称
- seller: 卖家昵称
- quantity: 数量
- status: 订单状态
- created_at: 创建时间

### notifications（通知表）
- id: 通知ID（主键）
- recipient: 接收者
- message: 消息内容
- type: 通知类型
- read: 是否已读（0/1）
- created_at: 创建时间

## API接口文档

### 商品相关
- `GET /api/products` - 获取所有在售商品
- `POST /api/products` - 添加商品
- `PUT /api/products/:id` - 修改商品
- `DELETE /api/products/:id` - 删除商品
- `GET /api/products/seller/:seller` - 获取卖家的商品

### 订单相关
- `POST /api/orders` - 创建订单
- `GET /api/orders/seller/:seller` - 获取卖家的订单

### 通知相关
- `GET /api/notifications/:recipient` - 获取通知
- `PUT /api/notifications/:id/read` - 标记已读

## 注意事项

1. 数据库文件 `campus-trading.db` 会在首次运行时自动创建
2. 如需重置数据，删除 `campus-trading.db` 文件后重启服务器即可
3. 测试时建议使用两个不同的浏览器或无痕模式窗口分别测试买家端和卖家端

## 许可证

MIT License
