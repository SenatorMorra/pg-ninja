import pg from "pg";
import defaults from "pg/lib/defaults.js";

const { Client } = pg;

export default class PG_Ninja {
  #client;
  #log;
  #send_log;

  constructor(config = defaults, log = true) {
    this.#client = new Client(config);
    this.#log = log;
    this.#send_log = (message, color = "white") => {
      let colors = {
        white: "\x1b[37m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        red: "\x1b[31m",
        blue: "\x1b[34m",
      };

      if (this.#log) {
        console.log(
          colors[color],
          `[${new Date().toLocaleString()}] - ${message}`
        );
      }
      return;
    };
    this.#client.connect().then((res) => {
      this.#send_log("successfully connected to the database", "green");
    });
  }

  async query(q, ...args) {
    return new Promise((resolve, reject) => {
      try {
        this.#client.query(q, ...args, (err, res) => {
          if (err) {
            this.#send_log(`error with query: ${q}`, "yellow");
            reject(err);
          } else {
            this.#send_log(`success query: ${q}`, "blue");
            resolve(res);
          }
        });
      } catch (e) {
        this.#send_log(`fatal error with query: ${q}`, "red");
        reject(e);
      }
    });
  }

  async transaction(querys) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.#client.query("BEGIN");
        let r;
        for (let i = 0; i < querys.length; i++) {
          r = await this.query(querys[i][0], querys[i][1]);
          if (r.command == undefined) {
            this.#send_log(
              `failed transaction of ${querys.length} queries`,
              "yellow"
            );
            await this.#client.query("ROLLBACK");
            reject(err);
          }
        }
        await this.#client.query("COMMIT");
        this.#send_log(
          `success transaction of ${querys.length} queries`,
          "blue"
        );
        resolve(r);
      } catch (e) {
        this.#send_log(
          `fatal error with transaction of ${querys.length} queries`,
          "red"
        );
        reject(e);
      }
    });
  }

  async multiquery(qrs, save_success = false) {
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
          this.query(...qrs[i]).then(
            (res) => {
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
                this.#send_log(
                  `new ${resp.completed}/${resp.completed_of} multi-query`,
                  "white"
                );
                resolve(resp);
              }
            },
            (err) => {}
          );
        }
      } catch (e) {
        resp.fatal_error = e;
        resp.success = false;
        this.#send_log(
          `fatal error of ${qrs.length} queries multi-query`,
          "red"
        );
        resolve(resp);
      }
    });
  }

  async end() {
    await this.#client.end();
    this.#send_log("closed connection", "white");
    return;
  }
}
