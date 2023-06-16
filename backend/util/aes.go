package util

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
)

func EncryptByAES(plaintext, key string) (string, error) {
	// CBC mode works on blocks so plaintexts may need to be padded to the
	// next whole block.
	plaintextBytes := []byte(plaintext)
	keyBytes := []byte(key)
	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", err
	}

	blockSize := block.BlockSize()
	plaintextBytes = pkcs5Padding(plaintextBytes, blockSize)
	blockMode := cipher.NewCBCEncrypter(block, keyBytes[:blockSize])
	encrypted := make([]byte, len(plaintextBytes))
	blockMode.CryptBlocks(encrypted, plaintextBytes)

	return base64.StdEncoding.EncodeToString(encrypted), nil
}

func DecryptByAES(encrypted, key string) (string, error) {
	encryptedStr, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		return "", nil
	}

	keyBytes := []byte(key)
	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", err
	}

	blockSize := block.BlockSize()
	blockMode := cipher.NewCBCDecrypter(block, keyBytes[:blockSize])
	plaintext := make([]byte, len(encryptedStr))
	blockMode.CryptBlocks(plaintext, encryptedStr)
	plaintext = pkcs5UnPadding(plaintext)

	return string(plaintext), nil
}

func pkcs5Padding(plaintext []byte, blockSize int) []byte {
	padding := blockSize - len(plaintext)%blockSize
	paddingText := bytes.Repeat([]byte{byte(padding)}, padding)

	return append(plaintext, paddingText...)
}

func pkcs5UnPadding(origData []byte) []byte {
	length := len(origData)
	unpadding := int(origData[length-1])

	return origData[:(length - unpadding)]
}
