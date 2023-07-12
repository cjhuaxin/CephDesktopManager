package backend

import (
	"context"
	"embed"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"reflect"
	osRuntime "runtime"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"github.com/cjhuaxin/CephDesktopManager/backend/errcode"
	"github.com/cjhuaxin/CephDesktopManager/backend/models"

	"github.com/cjhuaxin/CephDesktopManager/backend/resource"
	"github.com/cjhuaxin/CephDesktopManager/backend/service"
	"github.com/tidwall/gjson"

	"github.com/cjhuaxin/CephDesktopManager/backend/base"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"github.com/wailsapp/wails/v2/pkg/runtime"
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
	Ctx context.Context
}

type progress struct {
	downloadedBytes int64
	elapsedTime     float64
}

func WailsInit(assets embed.FS, appicon, wailsJson []byte) *options.App {
	baseService := &base.Service{}
	// Create an instance of the app structure
	app := &App{
		Service: baseService,
	}
	extraBindList := extraBinds(baseService)
	return &options.App{
		Title:  resource.AppTitle,
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Menu: buildAppMenu(wailsJson, appicon, app),
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
		},
		Linux: &linux.Options{
			// Icon:                aboutIcon,
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
	a.Ctx = ctx
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
		DownloadDir: filepath.Join(u.HomeDir, resource.DirPathDownload, resource.AppName),
	}

	//create folder
	err = a.createFolderIfNotExists()
	if err != nil {
		return err
	}

	return nil
}

func buildAppMenu(wailsJson, appicon []byte, app *App) *menu.Menu {
	rootMenu := menu.NewMenu()
	appName := gjson.GetBytes(wailsJson, "name")
	version := gjson.GetBytes(wailsJson, "info.productVersion")
	aboutMessage := fmt.Sprintf("Version %s\n\n Copyright © 2022 cjhuaxin", version.String())
	//app menu
	appMenu := rootMenu.AddSubmenu(appName.Raw)
	// about menu
	appMenu.AddText(fmt.Sprintf("About %s", appName.String()), nil, func(_ *menu.CallbackData) {
		runtime.MessageDialog(app.Ctx, runtime.MessageDialogOptions{
			Type:          "info",
			Title:         appName.String(),
			Message:       aboutMessage,
			Buttons:       nil,
			DefaultButton: "",
			CancelButton:  "",
			Icon:          appicon,
		})
	})
	// current version
	appMenu.Append(&menu.MenuItem{
		Label:    fmt.Sprintf("Current version: v%s", version.String()),
		Type:     menu.TextType,
		Disabled: true,
	})
	// update menu
	appMenu.AddText("Check for updates", keys.CmdOrCtrl("u"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.Ctx, resource.CHECK_UPGRADE, &models.ReleaseDetail{
			CurrentVersion: version.String(),
			OS:             osRuntime.GOOS,
			ARCH:           osRuntime.GOARCH,
		})
	})
	appMenu.AddSeparator()
	// hide menu
	appMenu.AddText(fmt.Sprintf("Hide %s", appName.String()), keys.CmdOrCtrl("h"), func(_ *menu.CallbackData) {
		runtime.Hide(app.Ctx)
	})
	appMenu.AddSeparator()
	// quit menu
	appMenu.AddText(fmt.Sprintf("Quit %s", appName.String()), keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
		runtime.Quit(app.Ctx)
	})

	// File menu
	if osRuntime.GOOS == "darwin" {
		// on macos platform, we should append EditMenu to enable Cmd+C,Cmd+V,Cmd+Z... shortcut
		rootMenu.Append(menu.EditMenu())
	}

	// Window menu available in v2.5
	rootMenu.Append(menu.WindowMenu())

	return rootMenu
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

func (a *App) DownloadUpgradeFile(req models.DownloadUpgradeFileReq) *models.BaseResponse {
	// Create a loop to read the response body and write it to the output file
	urlParts := strings.Split(req.DownloadUrl, "/")
	fileName := urlParts[len(urlParts)-1]
	path := filepath.Join(a.Paths.DownloadDir, fileName)
	// Open or Create the output file
	output, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0755)
	if err != nil {
		a.Log.Errorf("open download file failed: %v", err)
		return a.BuildFailed(errcode.HttpErr, err.Error())
	}

	defer output.Close()
	a.Log.Infof("start download upgrade file[%s]", path)

	timeout := 10 * time.Second
	client := http.Client{
		Transport: &http.Transport{
			Proxy: http.ProxyFromEnvironment,
			Dial: (&net.Dialer{
				Timeout: timeout,
			}).Dial,
			ResponseHeaderTimeout: timeout,
			TLSHandshakeTimeout:   timeout,
		},
	}
	// Send HTTP GET request
	response, err := client.Get(req.DownloadUrl)
	if err != nil {
		a.Log.Errorf("get download file failed: %v", err)
		return a.BuildFailed(errcode.HttpErr, err.Error())
	}
	defer response.Body.Close()
	// Get the content length of the file
	fileSize := response.ContentLength

	// Create a buffer(1M) to store downloaded data
	buffer := make([]byte, 8*1024*1024)

	// Create a variable to keep track of the total downloaded bytes
	var downloadedBytes int64
	// Create a variable to store the start time
	startTime := time.Now()
	var elapsedTime float64
	progressChan := make(chan *progress, 100)
	go TrackProgress(progressChan, fileSize, a)
	for {
		// Read data from the response body
		n, err := response.Body.Read(buffer)
		if err != nil && err != io.EOF {
			a.Log.Errorf("read buffer failed: %v", err)
			return a.BuildFailed(errcode.HttpErr, err.Error())
		}
		// Break the loop if we reach the end of the response body
		if n == 0 {
			executeUpgrade(a, path)
			break
		}
		// Write the downloaded data to the output file
		_, err = output.Write(buffer[:n])
		if err != nil {
			a.Log.Errorf("write buffer failed: %v", err)
			return a.BuildFailed(errcode.HttpErr, err.Error())
		}
		// Update the downloaded bytes count
		downloadedBytes += int64(n)
		// Calculate the elapsed time
		elapsedTime = time.Since(startTime).Seconds()
		progressChan <- &progress{
			downloadedBytes: downloadedBytes,
			elapsedTime:     elapsedTime,
		}
	}

	return a.BuildSucess(nil)
}

func executeUpgrade(app *App, filePath string) error {
	cmd := exec.Command("open", filePath)
	err := cmd.Run()
	if err != nil {
		app.Log.Errorf("open application ile failed: %v", err)
		return err
	}
	runtime.Quit(app.Ctx)

	return nil
}

func TrackProgress(ch chan *progress, fileSize int64, app *App) {
	latestProgress := &progress{}
	go func(latestProgress *progress) {
		for {
			progress := <-ch
			app.Log.Infof("download progress %#v", progress)
			latestProgress.downloadedBytes = progress.downloadedBytes
			latestProgress.elapsedTime = progress.elapsedTime
		}
	}(latestProgress)

	ticker := time.NewTicker(time.Second)
	for {
		<-ticker.C
		percentage := float64(latestProgress.downloadedBytes) / float64(fileSize) * 100

		rate := float64(latestProgress.downloadedBytes) / latestProgress.elapsedTime
		progress := &models.UpgradeProgress{
			// Calculate the download progress
			Percentage: percentage,
			Rate:       rate,
		}
		// publish progress to the frontend
		runtime.EventsEmit(app.Ctx, resource.UPGRADE_PROGRESS, progress)
		app.Log.Infof("downloading percentage %#v", progress)
		if percentage >= 100 {
			ticker.Stop()
			return
		}
	}
}
