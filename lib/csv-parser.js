const { promises: {readdir}, createReadStream } = require("fs");
const { resolve } = require("path");
const { createReadModule, DataStream } = require("scramjet");

module.exports = createReadModule(async ({workdir, threads}) => {
    const files = await readdir(workdir);

    return DataStream
        // we create a list of files
        .from(files)
        .map((file) => resolve(workdir, file))
        .separate(({x}) => "____" + (x % threads))
        .cluster(/** @param {DataStream} stream */ stream => {
            const {StringStream} = require("scramjet");

            return stream
                .flatMap((file) => {
                    return StringStream
                        .from(createReadStream(file))
                        .lines()
                        .CSVParse()
                        .each(console.log)
                    ;
                });
        })
        .mux()
    ;
});
