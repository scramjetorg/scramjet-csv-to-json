#!/usr/bin/env node

/* eslint-disable node/shebang */
/* eslint-disable no-process-exit */
/* eslint-disable node/no-unpublished-require */

const [, , _sfiles, _sfsize] = process.argv;
const faker = require("faker");
const { DataStream } = require("scramjet");
const { createWriteStream, mkdirSync, accessSync } = require("fs");
const { resolve } = require("path");

const si = require("si");

let x = BigInt(0);
// const {cpus} = require("os");
// const writes = Math.max(cpus().length*8, +files);
let file = 0;

if (!_sfsize) help();

const [fsize, files] = [si.bin.parse(_sfsize), si.parse(_sfiles)];

console.log(fsize, files, _sfiles, _sfsize);

if (fsize <= 0 || files <= 0 || isNaN(fsize + files)) help();

const workdir = resolve(__dirname, ".work");
try { accessSync(workdir); } catch { mkdirSync(workdir); }

DataStream
    .from(function* () {
        while (true) {
            const gender = faker.name.gender();
            const firstName = faker.name.firstName(gender);
            const lastName = faker.name.lastName(gender);

            yield {
                name: `${firstName} ${lastName}`,
                address: faker.address.streetAddress(),
                zipCode: faker.address.zipCode(),
                city: faker.address.city(),
                streetAddress: faker.address.streetAddress(),
                country: faker.address.country(),
                state: faker.address.state(),
                login: faker.internet.userName(firstName, lastName),
                email: faker.internet.email(firstName, lastName)
            };
        }
    })
    .separate(() => x++ % BigInt(files))
    .smap(/** @param {DataStream} stream */ stream => {
        const out = new DataStream();
        const filename = resolve(workdir, `file-${file++}.csv`);
        out.write({ ts: new Date().toISOString(), filename, state: "start" });

        let size = 0;

        stream
            .CSVStringify()
            // .do(x => console.log(x))
            .until(/** @param {Buffer} buf */ buf => (size += buf.length) > fsize)
            .pipe(createWriteStream(filename))
            .on("finish", () => out.end({ ts: new Date().toISOString(), filename, state: "done", size: si.bin.format(size) }))
            .on("error", e => out.raise(e))
        ;

        return out;
    })
    .mux()
    .each(console.log)
    .until(() => file >= files)
    .run();

function help() {
    console.error("Usage: generate.js <number-of-files> <size-of-file>");
    process.exit(1);
}

