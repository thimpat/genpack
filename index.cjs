#!/usr/bin/env node
const AnaLogger = require("analogger");

const {existsSync, readFileSync, writeFileSync} = require("fs");

const minimist = require("minimist");
const shell = require("shelljs");
const {joinPath, normalisePath} = require("@thimpat/libutils");
const {clonefile} = require("clonefile");
const {getHumanFileSize} = require("./utils/utils.cjs");
const {anaLogger} = require("analogger");
const {generateGitIgnore, generateNpmIgnore, getLastCommitMessage} = require("./utils/core.cjs");

const CJS_FOLDER = "cjs";
const ESM_FOLDER = "esm";
const CJS_ENTRY_POINT = "index";

const INITIAL_COMMIT_MESSAGE = "Initial commit";
const SECOND_COMMIT_MESSAGE = "BUILD: Add GenPack files";

const README_NAME = "README.md";

const CJS_EXTENSION = ".cjs";
const MJS_EXTENSION = ".mjs";

const TEMPLATE_FOLDER = "tpl";

const LOG_CONTEXTS = {
    DEFAULT: {color: "#689148"}
};

const DEVELOPER_TYPES = {
    DEBUGGER: "DEBUGGER",
    LOGGER  : "LOGGER",
    USER    : "USER",
    NONE    : "NONE",
    IGNORE  : "IGNORE",
};
const LOG_TARGETS = {ALL: "ALL", USER: DEVELOPER_TYPES.USER};

const setupConsole = function ()
{
    const anaLogger = new AnaLogger({name: "Analogger-Console"});
    anaLogger.setOptions({hideHookMessage: true});
    anaLogger.setDefaultContext(LOG_CONTEXTS.DEFAULT);
    anaLogger.setTargets(LOG_TARGETS);
    anaLogger.overrideConsole();
    anaLogger.overrideError();
};

const runShellCommand = function(commandLine)
{
    const {stdout, stderr} = shell.exec(commandLine, {async: false, silent: true})
    console.log({lid: "GP6000", color: "#656242"}, "$> " + commandLine);
    if (stdout)
    {
        const lines = stdout.split("\n")
        for (let i = 0; i < lines.length; ++i)
        {
            const line = lines[i];
            if (line.indexOf("DEFAULT:") > -1)
            {
                anaLogger.rawLog(line);
                continue;
            }
            console.log({lid: "GP4458"}, line);
        }
    }

    if (stderr)
    {
        const lines = stderr.split("\n")
        for (let i = 0; i < lines.length; ++i)
        {
            const line = lines[i];
            if (line.indexOf("ERROR:") > -1)
            {
                anaLogger.rawLog(line);
                continue;
            }
            console.log({lid: "GP4458"}, line);
        }
    }
}

const generateReadme = function ({packageName, cjsPath, mjsPath})
{
    try
    {
        // Generate typescript config for tests
        const readmePath = normalisePath(README_NAME);
        let content = readFileSync(readmePath, {encoding: "utf-8"});
        content = content.replaceAll("##packagename##", packageName);

        const cjsSize = getHumanFileSize(cjsPath);
        content = content.replaceAll("##cjsSize##", cjsSize);

        const mjsSize = getHumanFileSize(cjsPath);
        content = content.replaceAll("##mjsSize##", mjsSize);

        writeFileSync(readmePath, content, {encoding: "utf-8"});

        return true;
    }
    catch (e)
    {
        console.error({lid: "GP4453"}, e.message);
    }

    return false;
};

const init = async function (argv, {
    cjsFolderName = CJS_FOLDER,
    mjsFolderName = ESM_FOLDER,
    entryPoint = CJS_ENTRY_POINT
} = {})
{
    try
    {
        const simplifiedCliOptions = minimist(argv.slice(2));

        setupConsole();

        const currentDir = process.cwd();

        const cjsFolder = normalisePath(cjsFolderName);

        if (!existsSync(cjsFolder))
        {
            console.error({lid: "GP1531"}, `No cjs folder: [${cjsFolder}]`);
            process.exitCode = 3;
            return false;
        }

        const cjsPath = joinPath(cjsFolder, entryPoint + CJS_EXTENSION);
        if (!existsSync(cjsPath))
        {
            console.error({lid: "GP1533"}, `No .cjs file: [${cjsPath}]`);
            process.exitCode = 5;
            return false;
        }

        // Generate package.json if non-existent
        const packageJsonPath = joinPath(currentDir, "package.json");
        if (!existsSync(packageJsonPath))
        {
            runShellCommand(`npm -y init`);
        }

        // Generate .mjs
        const mjsFolder = normalisePath(mjsFolderName);
        runShellCommand(`to-esm ${cjsPath} --output ${mjsFolder} --update-all --extension .mjs`);

        // Generate d.ts
        const mjsPath = joinPath(mjsFolder, entryPoint + MJS_EXTENSION);
        runShellCommand(`tsc ${mjsPath} --declaration --allowJs --emitDeclarationOnly --outDir .`);

        // Copy template files
        const tplFolder = joinPath(__dirname, TEMPLATE_FOLDER);
        clonefile(tplFolder, currentDir);

        // Update package.json
        const packageJsonContent = readFileSync(packageJsonPath, {encoding: "utf-8"});
        const json = JSON.parse(packageJsonContent);

        const packageName = json.name;
        json.main = `${mjsPath}`;
        json.typings = `${mjsPath}`;
        json.type = "module";
        json.scripts = json.scripts || {};

        json.scripts["build:esm"] = `to-esm ${cjsPath} --output ${mjsFolder} --update-all --extension ${MJS_EXTENSION}`;
        json.scripts["build:dts"] = `tsc ${mjsPath} --declaration --allowJs --emitDeclarationOnly --outDir .`;
        json.scripts["build:test"] = `to-esm test/*.specs.cjs --output ./test/ --target esm --skipEsmResolution --skipLinks`;
        json.scripts["build:all"] = "npm run build:esm && npm run build:dts && npm run build:test";

        json.scripts["test:ts"] = "nyc mocha --config test/config/.mocharc.json";
        json.scripts["test:js"] = "nyc mocha";
        json.scripts["test"] = "npm run build:all && npm run test:js && npm run test:ts";

        const content = JSON.stringify(json, null, 2);
        writeFileSync(packageJsonPath, content, {encoding: "utf-8"});

        // Generate readme file
        generateReadme({packageName, cjsPath, mjsPath});

        // Generate .gitignore and .npmignore
        generateGitIgnore(currentDir);
        generateNpmIgnore(currentDir);


        // Setup repo if non-existent
        const gitPath = normalisePath(".git");
        if (!existsSync(gitPath))
        {
            runShellCommand(`git init`);
            runShellCommand(`git add ${README_NAME}`);
            runShellCommand(`git commit -m "${INITIAL_COMMIT_MESSAGE}"`);
        }

        // Install dependencies
        runShellCommand(`npm install -y mocha chai nyc -D`);
        runShellCommand(`npm install -y @types/mocha @types/chai -D`);
        runShellCommand(`npm install -y to-esm typescript ts-node -D`);

        // Run launchers
        runShellCommand(`npm run build:all`);
        runShellCommand(`npm test`);

        const lastMessage = getLastCommitMessage();
        if (lastMessage === INITIAL_COMMIT_MESSAGE)
        {
            const indexFiles = [".gitignore", ".npmignore",  "LICENSE",  "cjs/",  "esm/",  "index.d.mts",  "package-lock.json",  "package.json",  "test/"]
            for (let i = 0; i < indexFiles.length; ++i)
            {
                const filename = indexFiles[i];
                runShellCommand(`git add ${filename}`);
            }

            runShellCommand(`git commit -m "${SECOND_COMMIT_MESSAGE}"`);
        }

        console.log({lid: "GP1998"}, `==============================`)
        console.log({lid: "GP2000"}, `Package successfully generated`)

        return true;
    }
    catch (e)
    {
        console.error({lid: "GP6541"}, e.message);
    }

    return false;
};

(async (argv) =>
{
    await init(argv);
})(process.argv);

