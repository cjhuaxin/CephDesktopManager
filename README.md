<img align="left" width="120" src="build/appicon.png">

# Ceph Desktop Manager 

<hr/>

 A simple, better and GUI friendly [ceph](https://github.com/ceph/ceph) desktop manager, compatible with Linux, windows, mac. What's more, it support all the s3 protocol object storage service, like [minio](https://github.com/minio/minio).

[![Download](https://img.shields.io/github/v/release/cjhuaxin/CephDesktopManager)](https://github.com/cjhuaxin/CephDesktopManager/releases)
[![MIT](https://img.shields.io/github/license/cjhuaxin/CephDesktopManager)](LICENSE)
[![Twitter](https://img.shields.io/badge/Twitter-%40cjhuaxin-blue)](https://twitter.com/cjhuaxin)
[![MacOS](https://img.shields.io/badge/-macOS-gray?style=plastic&logo=apple)](https://img.shields.io/badge/-macOS-gray?style=plastic&logo=apple)
[![Windows](https://img.shields.io/badge/-windows-gray?style=plastic&logo=windows)](https://img.shields.io/badge/-windows-gray?style=plastic&logo=windows)

[简体中文](README.zh-CN.md)

## Installation

You can install it using one of the following two methods. Support macOS 11.0+

### 1. Manual

[Download](https://github.com/cjhuaxin/CephDesktopManager/releases) the latest release of the app.

### 2. Build Package

Ceph Desktop Manager is an application built on [walis](https://github.com/wailsapp/wails).
To know how to install wails, please refer [wails.io](https://wails.io/docs/gettingstarted/installation)

```bash
# on mac
wails build -clean -platform darwin/universal -trimpath

# on windows
wails build -clean -platform windows/amd64 -trimpath -webview2 Embed

# on Linux ARM chip
wails build -clean -platform linux/arm64 -trimpath
```

### FAQ
Ceph Desktop Manager is open source，secure application, but due to Apple's strict checking mechanism, you may encounter warning when opening it.

If you encounter the can't open problem, please refer to [Open Mac App from an unidentified developer](https://support.apple.com/zh-cn/guide/mac-help/mh40616/mac)


<div >
    <img src="https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@8bc7f6c41747ce8faa7df5a92949a0a94a4defc5/build/screenshot/1688547585175-unidentified-en.jpg" width="40%">
    <img src="https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@42c9e26e25cc5fafd6a1c52fa06fbc225c51e0e3/build/screenshot/1688549059650-confirmOpen-en.jpg" width="40%">
</div>

<div >
    <img src="https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@42c9e26e25cc5fafd6a1c52fa06fbc225c51e0e3/build/screenshot/1688548154020-oepnAnyway-en.jpg">
</div>

## Feature

### 🪣 Bucket
- [x] Create bucket[⭐️⭐️⭐️⭐️⭐️]
- [x] List buckets[⭐️⭐️⭐️⭐️⭐️]
- [x] Add custom bucket[⭐️⭐️⭐️⭐️⭐️]
- [x] Delete bucket[⭐️⭐️⭐️⭐️]
- [] Show bucket information[⭐️⭐️⭐️]
- [] Bucket policy configuration[⭐️⭐️⭐️]
- [] Bucket lifecycle configuration[⭐️⭐️⭐️]
- [] Synchronize buckets[⭐️]

### 🙋‍♀️ Object
- [x] List objects[⭐️⭐️⭐️⭐️⭐️]
- [x] Upload file[⭐️⭐️⭐️⭐️⭐️]
- [x] Delete object[⭐️⭐️⭐️⭐️⭐️]
- [x] Filter object with prefix[⭐️⭐️⭐️⭐️]
- [] Multiple files upload[⭐️⭐️⭐️⭐️]
- [] Batch downloads[⭐️⭐️⭐️]
- [] Download a floder[⭐️⭐️⭐️]
- [] Upload a folder[⭐️⭐️⭐️]
- [] Downloading progress[⭐️⭐️⭐️]
- [] Uploading progress[⭐️⭐️⭐️]
- [] Object icons beautification[⭐️⭐️⭐️]
- [] Preview object[⭐️⭐️⭐️]
- [] Mouse double-click optimization[⭐️⭐️]
- [] Batch delete objects[⭐️⭐️]
- [] Version support[⭐️⭐️]
- [] Tags support[⭐️⭐️]
- [] Object policy configuration[⭐️]
- [] Object lifecycle configuration[⭐️]

### 🖇️ Connection
- [x] Create Connection[⭐️⭐️⭐️⭐️⭐️]
- [x] Edit connection[⭐️⭐️⭐️⭐️]
- [x] Delete connection[⭐️⭐️⭐️⭐️]
- [x] Test connection[⭐️⭐️⭐️⭐️]
- [] Auto re-connect[⭐️⭐️]
- [] SSH support[⭐️⭐️]

### 👨🏻‍💻 App
- [x] Upgrade feature[⭐️⭐️⭐️⭐️]
- [] Automatically checks and downloads latest update file[⭐️⭐️]
- [] Configure the download directory[⭐️⭐️]
- [] Connection Configuration Sync on Cloud[⭐️]

## Enjoy!

![connection](https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@af765f47e865a2aace154091e1d61036b8d91804/build/screenshot/1688469286129-connection.jpg)

![list](https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@af765f47e865a2aace154091e1d61036b8d91804/build/screenshot/1688470097160-list.jpg)

![download](https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@af765f47e865a2aace154091e1d61036b8d91804/build/screenshot/1688470177806-download.jpg)

![upgrade](https://cdn.jsdelivr.net/gh/cjhuaxin/CephDesktopManager@9974759f0ea48363c09e17d60e895914c8efc7b7/build/screenshot/1689217445-upgrade.jpg)


## Easy-to-use open source command-line tool for S3
### <font size=5>[s5cmd](https://github.com/peak/s5cmd)</font> [![s3cmd](https://img.shields.io/github/stars/peak/s5cmd)](https://github.com/peak/s5cmd)

a very fast S3 and local filesystem execution tool.

### <font size=5>[s3cmd](https://github.com/s3tools/s3cmd)</font> [![s3cmd](https://img.shields.io/github/stars/s3tools/s3cmd)](https://github.com/s3tools/s3cmd)

a free command line tool and client for uploading, retrieving and managing data in Amazon S3 and other cloud storage service providers that use the S3 protocol.

## License

[MIT](LICENSE)