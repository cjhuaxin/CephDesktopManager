package util

import (
	"github.com/goware/urlx"
)

func NormalizeUrls(endpoint string) (string, error) {
	parsed, err := urlx.Parse(endpoint)
	if err != nil {
		return "", err
	}

	return parsed.String(), nil
}
