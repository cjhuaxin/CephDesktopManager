package backend

import (
	"context"
	"embed"
	"fmt"
	"os"
	"os/user"
	"path/filepath"
	"reflect"
	osRuntime "runtime"

	"github.com/cjhuaxin/CephDesktopManager/backend/resource"
	"github.com/cjhuaxin/CephDesktopManager/backend/service"
	"github.com/tidwall/gjson"

	"github.com/cjhuaxin/CephDesktopManager/backend/base"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

type Bind interface {
	Init() error
}

// App struct
type App struct {
	*base.Service
}

func WailsInit(assets embed.FS, wailsJson []byte) *options.App {
	baseService := &base.Service{}
	// Create an instance of the app structure
	app := &App{
		Service: baseService,
	}
	extraBindList := extraBinds(baseService)
	version := gjson.GetBytes(wailsJson, "info.productVersion")
	aboutTitle := "Ceph Desktop Manager"
	aboutMessage := fmt.Sprintf("Version %s\n\n Copyright © 2022 cjhuaxin", version)
	return &options.App{
		Title:  resource.AppTitle,
		Width:  1024,
		Height: 768,
		Assets: assets,
		Menu:   buildAppMenu(),
		// BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup: func(ctx context.Context) {
			err := app.onStart(ctx, extraBindList...)
			if err != nil {
				app.Log.Errorf("on startup error %v", err)
				os.Exit(-1)
			}
		},
		Bind: allBinds(app, extraBindList),
		Windows: &windows.Options{
			WebviewIsTransparent:              false,
			WindowIsTranslucent:               false,
			BackdropType:                      windows.Mica,
			DisableWindowIcon:                 false,
			DisableFramelessWindowDecorations: false,
			Theme:                             windows.SystemDefault,
			CustomTheme: &windows.ThemeSettings{
				DarkModeTitleBar:   windows.RGB(20, 20, 20),
				DarkModeTitleText:  windows.RGB(200, 200, 200),
				DarkModeBorder:     windows.RGB(20, 0, 20),
				LightModeTitleBar:  windows.RGB(200, 200, 200),
				LightModeTitleText: windows.RGB(20, 20, 20),
				LightModeBorder:    windows.RGB(200, 200, 200),
			},
		},
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: false,
				HideTitle:                  false,
				HideTitleBar:               false,
				FullSizeContent:            false,
				UseToolbar:                 false,
				HideToolbarSeparator:       true,
			},
			Appearance:           mac.NSAppearanceNameDarkAqua,
			WebviewIsTransparent: true,
			WindowIsTranslucent:  false,
			About: &mac.AboutInfo{
				Title:   aboutTitle,
				Message: aboutMessage,
				// Icon:    []byte{},
			},
		},
		Linux: &linux.Options{
			// Icon:                []byte{},
			WindowIsTranslucent: false,
			WebviewGpuPolicy:    linux.WebviewGpuPolicyAlways,
		},
		Debug: options.Debug{
			OpenInspectorOnStartup: false,
		},
	}
}

func extraBinds(baseService *base.Service) []Bind {
	return []Bind{
		service.NewConnectionService(baseService),
		service.NewBucketService(baseService),
		service.NewObjectService(baseService),
	}
}

func allBinds(app *App, extraBinds []Bind) []interface{} {
	all := make([]interface{}, 0, len(extraBinds)+1)
	all = append(all, app)

	for _, bind := range extraBinds {
		all = append(all, bind)
	}

	return all
}

func (a *App) onStart(ctx context.Context, binds ...Bind) error {
	//init directory for app
	err := a.initDirectoryStructure()
	if err != nil {
		return err
	}
	//init log
	a.initLog()
	for _, bind := range binds {
		err = bind.Init()
		if err != nil {
			return err
		}
	}

	return nil
}

func (a *App) initDirectoryStructure() error {
	u, err := user.Current()
	if err != nil {
		return err
	}
	homeDir := filepath.Join(u.HomeDir, resource.DirPathHome)
	fmt.Printf("user home is: %s\n", homeDir)
	a.Paths = &base.Paths{
		HomeDir:     homeDir, // Home directory of the user
		ConfDir:     filepath.Join(homeDir, resource.DirPathConf),
		DbDir:       filepath.Join(homeDir, resource.DirPathDb),
		LogDir:      filepath.Join(homeDir, resource.DirPathlog),
		TmpDir:      filepath.Join(homeDir, resource.DirPathTmp),
		DownloadDir: filepath.Join(homeDir, resource.DirPathDownload),
	}

	//create folder
	err = a.createFolderIfNotExists()
	if err != nil {
		return err
	}

	return nil
}

func buildAppMenu() *menu.Menu {
	appMenu := menu.NewMenu()
	//main menu
	appMenu.Append(menu.AppMenu())

	// File menu
	if osRuntime.GOOS == "darwin" {
		// on macos platform, we should append EditMenu to enable Cmd+C,Cmd+V,Cmd+Z... shortcut
		appMenu.Append(menu.EditMenu())
	}

	return appMenu
}

func (a *App) createFolderIfNotExists() error {
	pathValue := reflect.ValueOf(*a.Paths)
	for i := 0; i < pathValue.NumField(); i++ {
		path := pathValue.Field(i).String()
		if _, err := os.Stat(path); os.IsNotExist(err) {
			err = os.MkdirAll(path, os.ModePerm)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}

	return nil
}

func (a *App) initLog() {
	infoLogger := &lumberjack.Logger{
		Filename: filepath.Join(a.Paths.LogDir, "cdm.log"),
	}
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	infoCore := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderConfig),
		zapcore.AddSync(infoLogger),
		zapcore.InfoLevel,
	)
	logger := zap.New(infoCore, zap.AddStacktrace(zapcore.FatalLevel))
	a.Log = logger.Sugar()

	defer a.Log.Sync()
}
