# Tendrock-IPC

[ [📃English](./README.md) | ✅ 简体中文 ]

<a href="https://pkg-size.dev/@tendrock/ipc@0.2.0-alpha"><img src="https://pkg-size.dev/badge/install/36671" title="Install size for @tendrock/ipc"></a>
<a href="https://pkg-size.dev/@tendrock/ipc@0.2.0-alpha"><img src="https://pkg-size.dev/badge/bundle/5571" title="Bundle size for @tendrock/ipc"></a>

```cmd
npm install @tendrock/ipc@latest
```

Tendrock-IPC 是 Tendrock 体系下的一个工具库，旨在实现合理、便捷以及可用的通信协议。

Tendrock-IPC 提供了基本的脚本环境间通信功能，能允许您在不同的脚本环境间进行通信，实现消息发送、广播、调用和事件处理等功能。

## 支持版本

下面是当前支持的所有版本与对应安装命令

- ✅ Minecraft 基岩版 1.21.70 稳定版

  ```cmd
  npm install @tendrock/ipc@latest
  ```

- ✅ Minecraft 基岩版 1.21.71 稳定版

  ```cmd
  npm install @tendrock/ipc@latest
  ```

## 快速开始

首先，您需要先注册一个拥有您脚本环境信息的 `Ipc` 对象

```ts
const ipc = IpcV1.register('tutorial', '054f9427-466c-4cf2-9887-797b2f7869ec');
```

其中，第一个参数是您脚本环境的标识符，这相当于您脚本环境的“名字”，同时也是其他附加包脚本环境与其通信的基础，这里我们建议您使用**您模组标识符的全称**（如：工业时代²附加包的脚本环境标识符为： `industrial_craft_2`），以实现更好的区分。

> **Q：为什么不使用更加不易重复的 UUID 作为脚本环境的标识符？**
>
> A：脚本环境标识符的本质会更像是命名空间，而在实践过程中不同模组的命名空间出现重复的可能性可以忽略不计，尤其是在开发者们使用模组全称的情况下。同时，我们还希望能支持直接使用命令与附加包进行数据传输，而直接使用名称比 UUID 要稍微更有可读性一些（这一点无论是在脚本接口中还是在直接使用命令的情况下都有所体现）。这个包只是通信协议的实现，只要符合这个协议的数据格式，无论使用脚本还是使用命令都进行通信，这是我们致力于实现的事情。有关通信协议的更多信息，请查阅：[WIP]

第二个参数是该脚本环境的 UUID，这里建议您使用您 `manifest.json` 文件中脚本模块的 UUID，目前暂无具体用途，设计上可用于加密层，详情可查阅通信协议的分层设计： [WIP]。

接着您就可以使用获取到的 `ipc` 对象进行数据传输了。

### 发送、监听与防抖

#### send

`send` 函数允许您向指定脚本环境发送数据

包1：

```ts
ipc1.send('test:test_message', 'test message!', 'target_env_id');
```

包2：

```ts
ipc2.on('test:test_message', (event) => {
  world.sendMessage(`Received message: "${event.value}" from "${event.senderEnvId}"`);
});
```

其中，**发送消息与数据的长度理论上是无限制的**。`tendrock-ipc` 对超出该长度的消息进行了分块处理，并在接收到所有消息后自动合并，这一切过程都是封装好的，您只需关注端到端的发送与处理，而无需考虑消息是如何传输、接收与合并的。

#### on

#### debounce

### 跨包执行函数与处理函数执行

#### invoke

#### handle

## 协议

本项目基于 **MIT 协议**开源

见：[LICENSE中文](./LICENSE_CN.md)
