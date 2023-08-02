// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {models} from '../models';
import {s3} from '../models';
import {context} from '../models';

export function BuildFailed(arg1:string,arg2:string):Promise<models.BaseResponse>;

export function BuildSucess(arg1:any):Promise<models.BaseResponse>;

export function DeleteConnection(arg1:models.DeleteConnectionReq):Promise<models.BaseResponse>;

export function FixDatabaseLockd():Promise<void>;

export function GetCachedS3Client(arg1:string):Promise<s3.Client>;

export function GetConnectionDetail(arg1:models.GetConnectionDetailReq):Promise<models.BaseResponse>;

export function GetSavedConnectionList():Promise<models.BaseResponse>;

export function GetTimeoutContext():Promise<context.Context|context.CancelFunc>;

export function Init():Promise<void>;

export function InitAndCacheS3Client(arg1:string):Promise<s3.Client>;

export function InitDbClient():Promise<void>;

export function QueryEncryptionKey():Promise<string>;

export function SaveS3Connection(arg1:models.NewConnectionReq):Promise<models.BaseResponse>;

export function ServiceName():Promise<string>;

export function TestS3Connection(arg1:models.NewConnectionReq):Promise<models.BaseResponse>;
