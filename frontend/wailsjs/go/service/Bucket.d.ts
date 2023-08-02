// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {models} from '../models';
import {s3} from '../models';
import {context} from '../models';

export function AddCustomBucket(arg1:models.AddCustomBucketReq):Promise<models.BaseResponse>;

export function BuildFailed(arg1:string,arg2:string):Promise<models.BaseResponse>;

export function BuildSucess(arg1:any):Promise<models.BaseResponse>;

export function CreateBucket(arg1:models.CreateBucketReq):Promise<models.BaseResponse>;

export function DeleteBucket(arg1:models.DeleteBucketReq):Promise<models.BaseResponse>;

export function FixDatabaseLockd():Promise<void>;

export function GetBucketInfo(arg1:models.GetBucketInfoReq):Promise<models.BaseResponse>;

export function GetCachedS3Client(arg1:string):Promise<s3.Client>;

export function GetTimeoutContext():Promise<context.Context|context.CancelFunc>;

export function Init():Promise<void>;

export function InitAndCacheS3Client(arg1:string):Promise<s3.Client>;

export function InitDbClient():Promise<void>;

export function ListBuckets(arg1:models.ListBucketsReq):Promise<models.BaseResponse>;

export function QueryEncryptionKey():Promise<string>;

export function ServiceName():Promise<string>;
