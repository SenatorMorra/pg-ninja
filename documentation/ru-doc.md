## Документация для pg-ninja 

**навигация**

- [установка](#установка)
- **использование**:
    - [подключение библиотеки](#подключение)
    - [создать подключение](#конструктор)
- **документация**:
    - [запрос](#запрос)
    - [транзакция](#транзакция)
    - [мульт-запрос](#мульти-запрос)
    - [удалить подключение](#удалить-подключение)

---

## установка

---

```
$ npm i pg-ninja
```

## использование

---

библиотека содержит всего 4 функции, для запросов, транзакций, для завершения работы и поддерживает дополнительную функцию для тестирования. 

### **подключение**

```
import database from 'pg-ninja'

const connection = new database({
	user: 'admin',
	password: 'admin',
	host: 'localhost',
	database: 'project',
});
```

### **конструктор**

```
new database(connection: JSON, logging:boolean): object
```

объект подключения в формате JSON для `pg`

логи операций по стандарту включены, т.е. каждая операция будет приводить к созданию лог-записи об этом.
при выключенном значении в консоль ничего выводить не будет

цвета для операций:
```
белый - операция без спецификации (мульти-запросы, завершение работы)
зелёный - удачное подключение
жёлтый - ПРЕДУПРЕЖДЕНИЕ (отказ транзакции, ошибка в запросе)
красный - ОШИБКА (любая фатальная ошибка)
синий - успешно выполненная операция (транзакция, запрос)
```

---

# Документация

---

### **Queries**

sending PostgreSQL query and returns result of it

syntax:

```
connection.query(query: string, parameters?: Array<any>, reject_free?: boolean): Promise
```

promise returns only resolve value, no reject.

result syntax: 

reject_free = false
```
result: object
```

reject_free = true
success:
```
result: object
```
error:
```
result: Array<any>
result: [false, Object<Error>]
```

**result**: `resolve` - query body from `pg`, `reject` - Error body from `pg`

**reject free result**: `resolve` (success) - query body from `pg`, `resolve` (error) - [false, Error], where Error - Error body from `pg`

example:

```
connection.query('SELECT 1 AS test;').then(res => {
	console.log(res?.rows?.[0]); // { test: 1 }

	// SELECT queries also have option to convert result into .xlsx Excel file, so use .to_excel() on them like this:
	res.to_excel('./postgresql_reports/');

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
connection.transaction(queries: Array<string>, params: Array<array>, reject_free=false: boolean): Promise
```

**queries** - Array of string, each string - SQL query

**params** - Array of Array of any data, leave `null` / `undefined` for queries with no body.

**reject_free** - is Promise will be free to rejects. false - able Promise to return reject, true - disable Promise to return reject (only resolve) 

promise returns only resolve value, no reject

result syntax:

reject_free = false
```
result: object
```

reject_free = true
success:
```
result: object
```
error:
```
result: Array<any>
result: [false, Object<Error>]
```

**result**: `resolve` - last query body from `pg`, on `reject` - first Error body from `pg`

**reject free result**: `resolve` (success) - last query body from `pg`, `resolve` (error) - [false, Error], where Error - Error body from `pg`

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
