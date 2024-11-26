import pg from 'pg';
const { Pool } = pg;

export default class d {
    #pg_pool;
    
    constructor(config) {
        this.#pg_pool = new Pool(config);
        this.#pg_pool.connect();
    }
    
    async query(q, ...args) {
    	return new Promise((resolve, reject) => {
    		try {
    			this.#pg_pool.query(q, ...args, (err, res) => {
    				if (err) resolve([false, err]);
    				else resolve([true, res]);
    			});
    		} catch (e) {
    			resolve([false, e]);
    		}
    	});
    }

    async transaction(querys) {
    	return new Promise(async (resolve, reject) => {
    		try {
    			await this.#pg_pool.query('BEGIN');
    			let r;
    			for (let i = 0; i < querys.length; i++) {
    				r = await this.query(querys[i][0], querys[i][1]);
    				if (r[0] == false) {
    					await this.#pg_pool.query('ROLLBACK');
    					resolve([...r, i]);
    				}
    			}
    			await this.#pg_pool.query('COMMIT');
    			resolve(r);
    		} catch (e) {
    			resolve([false, e]);
    		}
    	});
    }
    
    async multiquery(qrs, save_success=false) {
        let resp = {
            completed: 0,
            completed_of: qrs.length,
            success_query_list: {},
            failed_query_list: {},
            error_list: {},
            fatal_error: undefined,
            operation_time: 0,
            success: true,
        };
        let flag = 0;
        return new Promise(async (resolve, reject) => {
            try {
                let time_point = new Date().valueOf();
                for (let i = 0; i < qrs.length; i++) {
                    this.query(...qrs[i]).then(res => {
                    	flag++;
                    	
                        if (res[0] == false) {
	                        resp.failed_query_list[i] = qrs[i];
	                        resp.error_list[i] = res[1];
	                    } else {
	                        resp.completed++;
	                        if (save_success === true) resp.success_query_list[i] = res[1];
	                    }

	                    if (flag == qrs.length) {
                            resp.operation_time = new Date().valueOf() - time_point;
                            resolve(resp);
                        }
                    }, err => {});
                }
            } catch(e) {
                resp.fatal_error = e;
                resp.success = false;
                resolve(resp);
            }
        });
    }
}