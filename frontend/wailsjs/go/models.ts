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
	export class NewConnectionReq {
	    name: string;
	    endpoint: string;
	    accesskey: string;
	    secretkey: string;
	    region: string;
	
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
	    }
	}

}

