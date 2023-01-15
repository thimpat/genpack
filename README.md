
## Description

GenPack is a package generator for npm

<br/>

---



## Installation

```shell
npm install genpack -g
```

<br/>

---

## Usage

```shell
genpack
```
<br/>

---

## Quick Start

To quickly generate an npm module, create a cjs folder + an index.cjs file.

e.g.
```
📁 package-root                
│
└───📁 cjs
     │
     └─── 📝 index.cjs
```

<br/>

📝 index.cjs content ↴
```javascript
const add = function(a, b)
{
    return a + b;
}
module.exports.add = add ;
```

<br/><br/>

##### From the CLI, go to the <package-root> directory, then run:

💻 ↴
```shell
$ genpack
```

<br/>

You will obtain an NPM hybrid package working with cjs, esm and typescript.

<br/>

---


## Options


| **Options**   | **default** | **Expect** | **Description**                            | 
|---------------|-------------|------------|--------------------------------------------|
| --version, -v | false       | boolean    | _Display GenPack version_                  |
| --repo        | ""          | string     | _Repo URL_                                 |
| --cli         | false       | boolean    | _To have the generated module support CLI_ |


<br/>

---


## Commands

<br/>

#### To update the esm/index.mjs file after modifying the cjs/index.cjs file, run:

```shell
$ npm run build:esm
``` 

<br/>


#### To update the tests after modifying unit-test.cjs:

```shell
$ npm run build:test
```

<br/>

#### To run the tests:

```shell
$ npm test
```

