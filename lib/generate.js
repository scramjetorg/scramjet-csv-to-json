/* eslint-disable node/no-unpublished-require */

const faker = require("faker");
const { DataStream } = require("scramjet");
const { createWriteStream, promises: {mkdir, access} } = require("fs");
const { resolve } = require("path");
const si = require("si");

module.exports = async function({workdir, files, fsize}) {

    let x = BigInt(0);
    let file = 0;
    
    try { await access(workdir); } catch { await mkdir(workdir); }
    
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
};