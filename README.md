## pg-ninja

Node.js library for work with PostgreSQL.

### cons `+`:
	- less code in result
 	- provide testing perfomance and queries base with `.multiquery()`
  	- prepared for work with SQL transactions with `.transaction()`
  	- easier to learn, **good option for students quick start!**
	- SQL-injection defence with binds
 	- compatibility with `node:pg`
### pros `-`:
	- less functionality
 	- lower performance

# **navigation**

- [installation](#installation)
- **usage**:
    - [import library](#Import)
    - [create connection object](#Constructor)
- **documentation**:
    - [query](#Queries)
    - [transaction](#Transactions)
    - [multi-query](#Multi-queries)
    - [release connection](#Release-connection)

## installation

---

```
$ npm i pg-ninja
```

## usage

---

library have only 4 functions, for queries, transactions, and for finish connection, also it supports function for testing with multi-queries and logging by default that will help you with testing or filling your database and queries base.

### **Import**

```
import database from 'pg-ninja'

const connection = new database({
	user: 'admin',
	password: 'admin',
	host: 'localhost',
	database: 'project',
});
```

### **Constructor**

```
new database(connection: JSON, logging:boolean): object
```

JSON connection object for `pg`

logging default is `true` so each `pg-nijna` operation leads to log record about it.
`false` value does not provide any console records.

colors for operations:
```
white - no specify operaion (multiquery, end connection)
green - success connection
yellow - WARN (rollback transaction, query error)
red - ERROR (any fatal error)
blue - success operation (transaction, query)
```

---

### **Queries**

sending PostgreSQL query and returns result of it

syntax:

```
connection.query(query: string, ...parameters: Array<any>): Promise
```

promise returns only resolve value, no reject.

result syntax: 

```
result: object
```

**result**: `resolve` - query body from `pg`, `reject` - Error body from `pg`

example:

```
connection.query('SELECT 1 AS test;').then(res => {
	console.log(res?.rows?.[0]); // { test: 1 }
}, err => {
    console.log(err); // in case of Connection / Query error
});
```

**! do not `return` reject-available function !**

---

### **Transactions**

sendind PostgreSQL transaction and returns result of it; on success commit transaction, on any error - rollback.

syntax

```
connection.transaction(queries: Array<string>, params: Array<array>): Promise
```

**queries** - Array of string, each string - SQL query

**params** - Array of Array of any data, leave `null` / `undefined` for queries with no body.

promise returns only resolve value, no reject

result syntax:

```
result: object
```

**result**: `resolve` - last query body from `pg`, on `reject` - first Error body from `pg`

example:

```
connection.transaction([
	'SELECT 1 AS test;',
	'SELECT $1 AS test;',
], [
	null,
    [ 1 ],
]).then(res => {
	console.log(res?.rows?.[0]); // { test: '1' }
}, err => {
    console.log(err); // Connection error / any invalid query
});
```

**! do not `return` reject-available function !**

---

### **Multi queries**

PostgreSQL shell for testing queries base or database security and filling tables

syntax:

```
connection.multiquery(queries: Array<string>, ...params(?): Array<array>, save_success(?)=false: boolean): Promise
```

**queries** - There are 2 options how to use this method:
1. send queries and parameters as one array with syntax: Array of `<query>` for connection.query() - [query, ...parametrs]
2. send queries and parameters separated with syntax: Array of string - SQL queries, Array of Array of any (parameters)

**save_success** - true - success results of queries will be saved in `responce.success_query_list`, false (default value) - `responce.success_query_list` will be empty
works for each variant of **queries** as the last function's argument.

promise returns only resolve value, no reject

result syntax:

```
responce: object
```

responce methods:

```
completed: integer - number of success completed queries

completed_of: integer - number of all queries

success_query_list: object JSON - array with results of success queries, where result index = query index in [...`<queries>`]

failed_query_list: object JSON - array of failed queries (: string), where query index = query index in [...`<queries>`]

error_list: object JSON - array with results of failed queries, where result index = query index in [...`<queries>`]

fatal_error: object - `undefined` in no fatal error or Error Object in case of fatal error

operation_time: integer - time in ms (divide by 1000 for seconds) for operate all queries

success: boolean - true on no Fatal Error (responce.fatal_error), false on Fatal Error (responce.fatal_error)
```

example with single-query-argument: 

```
connection.multiquery([
	[ 'SELECT * FROM users;' ], // users exist
	[ 'SELECT * FROM users WHERE id = $1', [1] ], // users exist but no users.id=1 -> 0 rows
	[ 'SELECT * FROM potato;' ], // no potato :( 
]).then(res => {
	console.log(`Completed ${res.completed} / ${res.completed_of} quries`); // Completed 2 / 3 queries
	for (let x in res.failed_query_list) {
		console.log(`Error in query №${x} - ${res.failed_query_list[x]}`); // Error in query №2 - SELECT * FROM potato;
	};
};
```

example with combine-query-argument:

```
connection.multiquery([
	'SELECT * FROM users;', // users exist
	'SELECT * FROM users WHERE id = $1', // users exist but no users.id=1 -> 0 rows
	'SELECT * FROM potato;', // no potato :( 
], [
	null, // first query
	[1], // second query
	null, // third query
).then(res => {
	console.log(`Completed ${res.completed} / ${res.completed_of} quries`); // Completed 2 / 3 queries
	for (let x in res.failed_query_list) {
		console.log(`Error in query №${x} - ${res.failed_query_list[x]}`); // Error in query №2 - SELECT * FROM potato;
	};
};
```

---

## Release connection

For simple non-server scripts we can finish our work with database by close connection.

syntax:

```
connection.end(): undefined
```

that's asynchronous function, use `await` for forced release
