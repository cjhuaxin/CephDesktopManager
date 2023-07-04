package main

import (
	"embed"

	"github.com/cjhuaxin/CephDesktopManager/backend"
	"github.com/wailsapp/wails/v2"
)

var (
	//go:embed all:frontend/dist
	assets embed.FS

	//go:embed wails.json
	wailsJSON []byte

	//go:embed build/appicon.png
	aboutIcon []byte
)

func main() {
	// Create application with options
	err := wails.Run(backend.WailsInit(assets, wailsJSON, aboutIcon))

	if err != nil {
		println("Error:", err.Error())
	}
}
