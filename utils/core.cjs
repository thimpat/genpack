const {writeFileSync} = require("fs");
const {joinPath} = require("@thimpat/libutils");
const {EOL} = require("os");
const shell = require("shelljs");

const generateGitIgnore = function (folderPath = process.cwd())
{
    const content = ["/node_modules/", "/.nyc_output/", "/*.tgz"];
    const targetPath = joinPath(folderPath, ".gitignore")
    writeFileSync(targetPath, content.join(EOL), {encoding: "utf-8"});
};

const generateNpmIgnore = function (folderPath = process.cwd())
{
    const content = [
        "/node_modules/",
        "/.nyc_output/",
        "/tsconfig.json",
        "/.to-esm.cjs",
        "/.idea/",
        "/.vscode/",
        "/*.tgz",
        "/test/"
    ];
    const targetPath = joinPath(folderPath, ".npmignore")
    writeFileSync(targetPath, content.join(EOL), {encoding: "utf-8"});
};

/**
 * Returns most recent commit message
 * @returns {string}
 */
const getLastCommitMessage = () =>
{
    // Get commit for most recent tag
    let str =  shell.exec(`git log -1 --pretty="%B"`, {silent: true}).stdout.trim() || "";
    return str.trim();
};

const getUserName = () =>
{
    // Get commit for most recent tag
    let str = shell.exec(`git config --global user.name`, {silent: true}).stdout.trim() || "";
    return str.trim();
};

const getUserEmail = () =>
{
    // Get commit for most recent tag
    let str = shell.exec(`git config --global user.email`, {silent: true}).stdout.trim() || "";
    return str.trim();
};

const addRepoOrigin = (url, origin = "origin") =>
{
    let currentRepo = shell.exec(`git remote -v`, {silent: true}).stdout.trim() || "";
    if (currentRepo.trim())
    {
        return
    }

    // Get commit for most recent tag
    shell.exec(`git remote add ${origin} ${url}`, {silent: true}).stdout.trim();
};

module.exports.generateGitIgnore = generateGitIgnore;
module.exports.generateNpmIgnore = generateNpmIgnore;

// Git stuff
module.exports.getLastCommitMessage = getLastCommitMessage;
module.exports.getUserName = getUserName;
module.exports.getUserEmail = getUserEmail;
module.exports.addRepoOrigin = addRepoOrigin;

