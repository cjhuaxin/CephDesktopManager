<img align="left" width="120" src="build/appicon.png">

# Ceph Desktop Manager 

<hr/>

简单、更好、GUI友好的[ceph](https://github.com/ceph/ceph)桌面管理器，兼容Linux、windows、mac。 更重要的是，它支持所有的s3协议对象存储服务，如 [minio](https://github.com/minio/minio)

[![Download](https://img.shields.io/github/downloads/cjhuaxin/CephDesktopManager/total)](https://img.shields.io/github/downloads/cjhuaxin/CephDesktopManager/total)
[![MIT](https://img.shields.io/github/license/cjhuaxin/CephDesktopManager)](LICENSE)
[![Twitter](https://img.shields.io/badge/Twitter-%40cjhuaxin-blue)](https://twitter.com/cjhuaxin)
[![MacOS](https://img.shields.io/badge/-macOS-gray?style=plastic&logo=apple)](https://img.shields.io/badge/-macOS-gray?style=plastic&logo=apple)
[![Windows](https://img.shields.io/badge/-windows-gray?style=plastic&logo=windows)](https://img.shields.io/badge/-windows-gray?style=plastic&logo=windows)

[English](README.md)

## 安装

你可以用以下两种方法之一来安装它。 支持MacOS 11.0以上版本

### 1. 手动安装

[下载](https://github.com/cjhuaxin/CephDesktopManager/releases) 最新版本的APP

### 2. 构建应用

```bash
# on mac
wails build -clean -platform darwin/universal -trimpath

# on windows
wails build -clean -platform windows/amd64 -trimpath -webview2 Embed

# on Linux ARM chip
wails build -clean -platform linux/arm64 -trimpath
```

Ceph Desktop Manager 是一个建立在[walis](https://github.com/wailsapp/wails)的应用程序。 要知道如何安装wails，请参考[wails.io](https://wails.io/docs/gettingstarted/installation)

### FAQ
Ceph Desktop Manager是开源的，安全的应用程序，但由于苹果的严格检查机制，当你打开应用的时候，可能会遇到警告

如果遇到无法打开的问题，请参考 [打开来自身份不明开发者的 Mac App](https://support.apple.com/zh-cn/guide/mac-help/mh40616/mac)

<div >
    <img src="https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@42c9e26e25cc5fafd6a1c52fa06fbc225c51e0e3/build/screenshot/1688547585175-unidentified.jpg" width="40%">
    <img src="https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@430bc6b78627db4be64edc086ac8a63b8712dd43/build/screenshot/1689228356040-confirmOpen-ch.jpg" width="40%">
</div>

<div >
    <img src="https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@42c9e26e25cc5fafd6a1c52fa06fbc225c51e0e3/build/screenshot/1688548154020-oepnAnyway.jpg">
</div>


## 功能

### 🪣 桶
- [x] 创建桶[⭐️⭐️⭐️⭐️⭐️]
- [x] 桶列表[⭐️⭐️⭐️⭐️⭐️]
- [x] 添加自定义桶[⭐️⭐️⭐️⭐️⭐️]
- [x] 删除桶[⭐️⭐️⭐️⭐️]
- [x] 显示桶详情[⭐️⭐️⭐️]
- [ ] 桶策略配置[⭐️⭐️⭐️]
- [ ] 桶生命周期配置[⭐️⭐️⭐️]
- [ ] 同步两个不同的桶[⭐️]

### 🙋‍♀️ Object
- [x] 对象列表[⭐️⭐️⭐️⭐️⭐️]
- [x] 上传文件[⭐️⭐️⭐️⭐️⭐️]
- [x] 删除对象[⭐️⭐️⭐️⭐️⭐️]
- [x] 通过前缀过滤[⭐️⭐️⭐️⭐️]
- [ ] 支持多文件上传[⭐️⭐️⭐️⭐️]
- [ ] 支持批量下载[⭐️⭐️⭐️]
- [ ] 上传一个文件夹[⭐️⭐️⭐️]
- [ ] 下载一个文件夹[⭐️⭐️⭐️]
- [ ] 下载进度条[⭐️⭐️⭐️]
- [ ] 上传进度条[⭐️⭐️⭐️]
- [ ] 对象列表图标美化[⭐️⭐️⭐️]
- [ ] 预览对象[⭐️⭐️⭐️]
- [ ] 鼠标双击优化[⭐️⭐️]
- [ ] 批量删除对象[⭐️⭐️]
- [ ] 支持对象多版本[⭐️⭐️]
- [ ] 支持对象标签[⭐️⭐️]
- [ ] 对象策略配置[⭐️]
- [ ] 对象生命周期配置[⭐️]

### 连接
- [x] 创建连接[⭐️⭐️⭐️⭐️⭐️]
- [x] 边界连接[⭐️⭐️⭐️⭐️]
- [x] 删除连接[⭐️⭐️⭐️⭐️]
- [x] 测试连接可用性[⭐️⭐️⭐️⭐️]
- [ ] 自动重连[⭐️⭐️]
- [ ] 支持SSH[⭐️⭐️]

### 应用
- [x] 支持自动升级[⭐️⭐️⭐️⭐️]
- [ ] 自动检测和下载最新版本的更新文件[⭐️⭐️]
- [ ] 支持配置下载文件路径[⭐️⭐️]
- [ ] 用户连接信息可以通过云同步[⭐️]

## 起飞!

![connection](https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@af765f47e865a2aace154091e1d61036b8d91804/build/screenshot/1688469286129-connection.jpg)

![list](https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@af765f47e865a2aace154091e1d61036b8d91804/build/screenshot/1688470097160-list.jpg)

![download](https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@af765f47e865a2aace154091e1d61036b8d91804/build/screenshot/1688470177806-download.jpg)

![upgrade](https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@9974759f0ea48363c09e17d60e895914c8efc7b7/build/screenshot/1689217445-upgrade.jpg)


##  好用的 S3 开源命令行工具
### <font size=5>[s5cmd](https://github.com/peak/s5cmd)</font> [![s3cmd](https://img.shields.io/github/stars/peak/s5cmd)](https://github.com/peak/s5cmd)

非常快速的S3和本地文件系统执行工具

### <font size=5>[s3cmd](https://github.com/s3tools/s3cmd)</font> [![s3cmd](https://img.shields.io/github/stars/s3tools/s3cmd)](https://github.com/s3tools/s3cmd)

免费的命令行工具和客户端，用于上传、检索和管理Amazon S3和其他使用S3协议的云存储服务提供商中的数据。

## License

[MIT](LICENSE)