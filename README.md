## @maxar/transform-ol

Helpers and custom GeoTIFF source for use with OpenLayers 10.9.0+.

See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for usage examples and an API reference.

Language level
* ES6

Module system
* ES6 module system

It can be used in both TypeScript and JavaScript. In TypeScript, the definition should be automatically resolved via `package.json`. ([Reference](http://www.typescriptlang.org/docs/handbook/typings-for-npm-packages.html))

### Building

To build and compile the typescript sources to javascript use:
```
npm install
npm run build
```

### Publishing

First build the package then run ```npm publish```

### Consuming

navigate to the folder of your consuming project and run one of the following commands.

_published:_

```
npm install @maxar/transform-ol@1.0.0 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
