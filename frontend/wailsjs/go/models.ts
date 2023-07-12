export namespace models {
	
	export class AddCustomBucketReq {
	    connectionId: string;
	    bucket: string;
	
	    static createFrom(source: any = {}) {
	        return new AddCustomBucketReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connectionId = source["connectionId"];
	        this.bucket = source["bucket"];
	    }
	}
	export class BaseResponse {
	    err_code: string;
	    err_msg: string;
	    data: any;
	
	    static createFrom(source: any = {}) {
	        return new BaseResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.err_code = source["err_code"];
	        this.err_msg = source["err_msg"];
	        this.data = source["data"];
	    }
	}
	export class CreateBucketReq {
	    connectionId: string;
	    bucket: string;
	
	    static createFrom(source: any = {}) {
	        return new CreateBucketReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connectionId = source["connectionId"];
	        this.bucket = source["bucket"];
	    }
	}
	export class DeleteBucketReq {
	    connectionId: string;
	    bucket: string;
	    custom: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DeleteBucketReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connectionId = source["connectionId"];
	        this.bucket = source["bucket"];
	        this.custom = source["custom"];
	    }
	}
	export class DeleteConnectionReq {
	    connectionId: string;
	
	    static createFrom(source: any = {}) {
	        return new DeleteConnectionReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connectionId = source["connectionId"];
	    }
	}
	export class DeleteObjectsReq {
	    connectionId: string;
	    bucket: string;
	    keys: string[];
	
	    static createFrom(source: any = {}) {
	        return new DeleteObjectsReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connectionId = source["connectionId"];
	        this.bucket = source["bucket"];
	        this.keys = source["keys"];
	    }
	}
	export class DownloadObjectsReq {
	    connectionId: string;
	    bucket: string;
	    keys: string[];
	
	    static createFrom(source: any = {}) {
	        return new DownloadObjectsReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connectionId = source["connectionId"];
	        this.bucket = source["bucket"];
	        this.keys = source["keys"];
	    }
	}
	export class DownloadUpgradeFileReq {
	    downloadUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new DownloadUpgradeFileReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.downloadUrl = source["downloadUrl"];
	    }
	}
	export class GetConnectionDetailReq {
	    connectionId: string;
	
	    static createFrom(source: any = {}) {
	        return new GetConnectionDetailReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connectionId = source["connectionId"];
	    }
	}
	export class ListBucketsReq {
	    connectionId: string;
	
	    static createFrom(source: any = {}) {
	        return new ListBucketsReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connectionId = source["connectionId"];
	    }
	}
	export class ListObjectsReq {
	    connectionId: string;
	    bucket: string;
	    delimiter: string;
	    prefix: string;
	    continueToken: string;
	    pageSize: number;
	
	    static createFrom(source: any = {}) {
	        return new ListObjectsReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connectionId = source["connectionId"];
	        this.bucket = source["bucket"];
	        this.delimiter = source["delimiter"];
	        this.prefix = source["prefix"];
	        this.continueToken = source["continueToken"];
	        this.pageSize = source["pageSize"];
	    }
	}
	export class NewConnectionReq {
	    id: string;
	    name: string;
	    endpoint: string;
	    accessKey: string;
	    secretKey: string;
	    region: string;
	    pathStyle: number;
	
	    static createFrom(source: any = {}) {
	        return new NewConnectionReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.endpoint = source["endpoint"];
	        this.accessKey = source["accessKey"];
	        this.secretKey = source["secretKey"];
	        this.region = source["region"];
	        this.pathStyle = source["pathStyle"];
	    }
	}
	export class PrepareForUploadingReq {
	    connectionId: string;
	
	    static createFrom(source: any = {}) {
	        return new PrepareForUploadingReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connectionId = source["connectionId"];
	    }
	}

}

