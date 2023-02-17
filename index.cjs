#!/usr/bin/env node
const AnaLogger = require("analogger");

const {existsSync, readFileSync, writeFileSync} = require("fs");

const minimist = require("minimist");
const shell = require("shelljs");
const {joinPath, normalisePath} = require("@thimpat/libutils");
const {clonefile} = require("clonefile");
const {getHumanFileSize} = require("./utils/utils.cjs");
const {anaLogger} = require("analogger");
const {
    generateGitIgnore,
    generateNpmIgnore,
    getLastCommitMessage,
    getUserName,
    getUserEmail,
    addRepoOrigin
} = require("./utils/core.cjs");

const CJS_FOLDER = "cjs";
const ESM_FOLDER = "esm";
const CJS_ENTRY_POINT = "index";

const INITIAL_COMMIT_MESSAGE = "Initial commit";
const SECOND_COMMIT_MESSAGE = "BUILD: Add GenPack files";

const README_NAME = "README.md";
const LICENSE_NAME = "LICENSE";
const DEFAULT_LICENSE = "MIT";
const BINARY_CLI_NAME = "cli.js";

const CJS_EXTENSION = ".cjs";
const MJS_EXTENSION = ".mjs";
const DTS_EXTENSION = ".d.mts";

const TEMPLATE_FOLDER = "tpl";
const CONDITIONAL_TEMPLATE_FOLDER = "tpl-optional";

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

const runShellCommand = function (commandLine)
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

const generateReadme = function ({packageName, cjsPath})
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

/**
 *
 * @param type
 * @param json
 * @returns {boolean}
 */
const generateLicense = (type, json, {email = ""} = {}) =>
{
    try
    {
        if (!type)
        {
            return false;
        }
        json.license = type.toUpperCase().replaceAll("_", " ");

        // Copy license
        let authorName = json.author;
        const srcLicensePath = joinPath(__dirname, CONDITIONAL_TEMPLATE_FOLDER, LICENSE_NAME + "." + type);
        if (!existsSync(srcLicensePath))
        {
            console.error({lid: 1345}, `The ${json.license} license is not supported.`)
            console.log({lid: 1346}, `Please, send a PR to ${json?.repository?.url?.split("git+")[1]} if you want this license to be part of GenPack.`);
            console.log({lid: 1348}, `The new license should be placed in ./genpack/tpl/`);
            console.log({lid: 1350}, `Thank you`);
            return false;
        }

        const targetLicensePath = normalisePath(LICENSE_NAME);
        clonefile(srcLicensePath, targetLicensePath, {force: true});

        // Update license
        let year = "" + new Date().getUTCFullYear();
        let content = readFileSync(targetLicensePath, {encoding: "utf-8"});
        content = content.replaceAll("##author##", authorName);
        content = content.replaceAll("##year##", year);
        content = content.replaceAll("##email##", `<${email}>`);
        writeFileSync(targetLicensePath, content, {encoding: "utf-8"});

        return true;
    }
    catch (e)
    {
        console.error({lid: "GP4453"}, e.message);
    }

    return false;
};

const addRepoInformation = function ({repoUrl, packageJsonPath})
{
    const packageJsonContent = readFileSync(packageJsonPath, {encoding: "utf-8"});
    const json = JSON.parse(packageJsonContent);

    if (json.repository)
    {
        return;
    }

    addRepoOrigin(repoUrl);
    const memDepencies = json.dependencies || {};
    const memDevDepencies = json.devDependencies || {};
    runShellCommand(`npm init -y`);

    const info = {}
    info.dependencies = Object.assign({}, memDepencies);
    info.memDevDepencies = Object.assign({}, memDevDepencies);

    setTimeout(function (info)
    {
        const packageJsonContent = readFileSync(packageJsonPath, {encoding: "utf-8"});
        const json = JSON.parse(packageJsonContent);

        json.dependencies = info.dependencies;
        json.memDevDepencies =  info.memDevDepencies;

        const content = JSON.stringify(json, null, 2);
        writeFileSync(packageJsonPath, content, {encoding: "utf-8"});

    }.bind(null, info), 5000)

}

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

        let genpackVersion
        const genpackPackageJsonPath = joinPath(__dirname, "package.json");
        const genpackInfo = require(genpackPackageJsonPath);
        genpackVersion = genpackInfo.version;
        if (simplifiedCliOptions.v || simplifiedCliOptions.version)
        {
            console.rawLog(genpackVersion);
            return
        }

        let cliName = simplifiedCliOptions.cli || simplifiedCliOptions.bin || "";
        if (cliName)
        {
            if (cliName === true)
            {
                cliName = BINARY_CLI_NAME;
            }
            else if (!cliName.endsWith("js"))
            {
                cliName = cliName + ".js";
            }
        }

        let repoUrl = simplifiedCliOptions.repo;

        const currentDir = process.cwd();

        const cjsFolder = normalisePath(cjsFolderName);

        // Key values
        let authorName = simplifiedCliOptions.author || getUserName();
        let authorEmail = simplifiedCliOptions.email || getUserEmail();
        let licenseType = simplifiedCliOptions.license || "";
        let brandNewRepo = false;
        const tplFolder = joinPath(__dirname, TEMPLATE_FOLDER);
        const conditionalTplFolder = joinPath(__dirname, CONDITIONAL_TEMPLATE_FOLDER);


        const gitPath = normalisePath(".git");
        if (!existsSync(gitPath))
        {
            brandNewRepo = true;
        }

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
            runShellCommand(`npm init -y`);
        }

        // Generate .mjs
        const mjsFolder = normalisePath(mjsFolderName);
        runShellCommand(`to-esm ${cjsPath} --output ${mjsFolder} --update-all --extension .mjs`);

        // Generate d.ts
        const mjsPath = joinPath(mjsFolder, entryPoint + MJS_EXTENSION);
        runShellCommand(`tsc ${mjsPath} --declaration --allowJs --emitDeclarationOnly --outDir .`);
        let dtsPath = normalisePath(entryPoint + DTS_EXTENSION);

        // Copy template files
        clonefile(tplFolder, currentDir, {force: brandNewRepo, silent: false, hideOverwriteError: true});

        // Update package.json
        const packageJsonContent = readFileSync(packageJsonPath, {encoding: "utf-8"});
        const json = JSON.parse(packageJsonContent);

        const packageName = json.name;
        json.main = `${mjsPath}`;
        json.typings = `${dtsPath}`;
        json.type = "module";
        json.scripts = json.scripts || {};

        json.scripts["genpack:build:esm"] = `to-esm ${cjsPath} --output ${mjsFolder} --update-all --extension ${MJS_EXTENSION}`;
        json.scripts["genpack:build:dts"] = `tsc ${mjsPath} --declaration --allowJs --emitDeclarationOnly --outDir .`;
        json.scripts["genpack:build:test"] = `to-esm test/*.specs.cjs --output ./test/ --target esm --skipEsmResolution --skipLinks`;
        json.scripts["genpack:build:all"] = "npm run genpack:build:esm && npm run genpack:build:dts && npm run genpack:build:test";

        json.scripts["genpack:test:ts"] = "nyc mocha --config test/config/.mocharc.json";
        json.scripts["genpack:test:js"] = "nyc mocha";
        json.scripts["genpack:test"] = "npm run genpack:build:all && npm run genpack:test:js && npm run genpack:test:ts";

        if (brandNewRepo || licenseType)
        {
            json.author = authorName || json.author;
            licenseType = licenseType || json.license;

            // Generate license file
            generateLicense(licenseType, json, {email: authorEmail});
        }

        json.author = authorName || json.author;

        let cliPath = "";
        if (cliName)
        {
            cliPath = normalisePath(cliName);
            json.bin = json.bin || {};
            json.bin[cliName] = cliPath;

            const srcCliPath = joinPath(conditionalTplFolder, BINARY_CLI_NAME);
            clonefile(srcCliPath, cliPath, {silent: false, hideOverwriteError: true});
        }

        const content = JSON.stringify(json, null, 2);
        writeFileSync(packageJsonPath, content, {encoding: "utf-8"});

        if (repoUrl)
        {
            addRepoInformation({repoUrl, packageJsonPath});
        }

        // Generate readme file
        generateReadme({packageName, cjsPath, mjsPath});

        // Generate .gitignore and .npmignore
        generateGitIgnore(currentDir);
        generateNpmIgnore(currentDir);

        // Setup repo if non-existent
        if (brandNewRepo)
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
        runShellCommand(`npm run genpack:build:all`);
        runShellCommand(`npm run genpack:test`);

        const lastMessage = getLastCommitMessage();
        if (lastMessage === INITIAL_COMMIT_MESSAGE)
        {
            const indexFiles = [
                ".gitignore",
                ".npmignore",
                "LICENSE",
                "cjs/",
                "esm/",
                "index.d.mts",
                "package-lock.json",
                "package.json",
                "test/",
                "tsconfig.json",
                ".to-esm.cjs",
                "cli.js",
            ]
            for (let i = 0; i < indexFiles.length; ++i)
            {
                const filename = indexFiles[i];
                if (!existsSync(filename))
                {
                    continue;
                }
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

