export namespace models {
	
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
	    name: string;
	    endpoint: string;
	    accesskey: string;
	    secretkey: string;
	    region: string;
	    pathstyle: number;
	
	    static createFrom(source: any = {}) {
	        return new NewConnectionReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.endpoint = source["endpoint"];
	        this.accesskey = source["accesskey"];
	        this.secretkey = source["secretkey"];
	        this.region = source["region"];
	        this.pathstyle = source["pathstyle"];
	    }
	}

}

