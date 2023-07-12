package main

import (
	"embed"

	"github.com/cjhuaxin/CephDesktopManager/backend"
	"github.com/wailsapp/wails/v2"
)

var (
	//go:embed all:frontend/dist
	assets embed.FS

	//go:embed build/appicon.png
	appicon []byte

	//go:embed wails.json
	wailsJSON []byte
)

func main() {
	// Create application with options
	err := wails.Run(backend.WailsInit(assets, appicon, wailsJSON))

	if err != nil {
		println("Error:", err.Error())
	}
}
