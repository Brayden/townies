// Preserve the existing prepared-statement rules and atomic D1 batches while
// executing them synchronously against this town's private SQLite database.
export class TownDatabase {
 constructor(readonly storage:DurableObjectStorage){}
 prepare(sql:string){return new Statement(this,sql)}
 batch(statements:Statement[]){return Promise.resolve(this.storage.transactionSync(()=>statements.map(s=>s.execute())))}
 exec(sql:string){this.storage.sql.exec(sql);return Promise.resolve({count:1,duration:0})}
 asD1(){return this as unknown as D1Database}
}
class Statement {
 constructor(readonly db:TownDatabase,readonly sql:string,readonly values:any[]=[] ){}
 bind(...values:any[]){return new Statement(this.db,this.sql,values)}
 execute(){const cursor=this.db.storage.sql.exec(this.sql,...this.values);const results=cursor.toArray();const changes=Number(this.db.storage.sql.exec('SELECT changes() AS n').one().n);return {success:true,results,meta:{changes,rows_read:cursor.rowsRead,rows_written:cursor.rowsWritten,duration:0,last_row_id:0,changed_db:changes>0,size_after:0}}}
 async all(){return this.execute()}
 async run(){return this.execute()}
 async first(column?:string){const row=this.execute().results[0];return row?(column?row[column]:row):null}
 async raw(){return this.execute().results.map(r=>Object.values(r))}
}
