#!/bin/bash

if [ ! -n "$1" ]; then
    echo 'Error: version is empty'
    exit 1
fi

version=$1

mkdir build/release/$version

# build windows arm64
wails build -clean -platform windows/arm64 -trimpath -webview2 Embed
mv build/bin/Ceph-Desktop-Manager.exe build/release/$version/Ceph-Desktop-Manager-arm64-$version.exe

# build windows amd64
wails build -clean -platform windows/amd64 -trimpath -webview2 Embed
mv build/bin/Ceph-Desktop-Manager.exe build/release/$version/Ceph-Desktop-Manager-amd64-$version.exe

build mac universal
wails build -clean -platform darwin/universal -trimpath
cd build/bin
pwd
create-dmg 'Ceph Desktop Manager.app' --overwrite
mv "Ceph Desktop Manager ${version:1}.dmg" ../release/$version/Ceph-Desktop-Manager-darwin-universal-$version.dmg
