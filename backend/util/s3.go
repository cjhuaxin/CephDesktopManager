package util

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cjhuaxin/CephDesktopManager/backend/resource"
)

func CreateS3ClientInstance(endpoint, ak, sk, region string, pathSytle int8) (*s3.Client, error) {
	creds := credentials.NewStaticCredentialsProvider(ak, sk, "")
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: endpoint,
		}, nil
	})
	cfg, err := config.LoadDefaultConfig(
		context.TODO(),
		config.WithCredentialsProvider(creds),
		config.WithEndpointResolverWithOptions(customResolver),
		config.WithRegion(region),
		config.WithRetryMode(aws.RetryModeStandard),
		config.WithRetryMaxAttempts(3),
	)
	if err != nil {
		return nil, err
	}

	return s3.NewFromConfig(cfg, func(o *s3.Options) {
		if pathSytle == resource.ForcePathSytle {
			o.UsePathStyle = true
		}
	}), nil
}
