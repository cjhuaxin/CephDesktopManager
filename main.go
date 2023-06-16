package main

import (
	"embed"

	"github.com/cjhuaxin/CephDesktopManager/backend"
	"github.com/wailsapp/wails/v2"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create application with options
	err := wails.Run(backend.WailsInit(assets))

	if err != nil {
		println("Error:", err.Error())
	}
}
