# tailwind-grid-container

A Tailwind Plugin for Generating a Container Class with Layout Breakouts

This plugin mimics the default container class provided by Tailwind and introduces the ability to "escape" the container. This is commonly useful when you want to create a background image that spans the full size while maintaining consistent content sizing.

The inspiration for this plugin comes from [Kevin Powell's "A New Approach to Container and Wrapper Classes" video](https://www.youtube.com/watch?v=c13gpBrnGEw&t=704s) and [Ryan Mulligan's "Layout Breakouts with CSS Grid" blog post](https://ryanmulligan.dev/blog/layout-breakouts/). A huge shoutout to them for their insights.


# Installation and setup

To install the package run

```bash
# Using npm
npm install tailwindcss-grid-container

# Using Yarn
yarn add tailwindcss-grid-container

# Using pnpm
pnpm install tailwindcss-grid-container
```

Add the tailwind plugin to your `tailwind.config.js`

```js
  corePlugins: {
    container: false,
  },
  plugins: [
    require("tailwind-grid-container")({
      // Options
    }),
  ],
```

# Usage

The container can be used out of the box without any configuration and will behave like the default Tailwind container, with the addition of the `container-full` class`. The container-full class allows you to escape the container and gives you the freedom to adjust the children to the full size again.

If you would like to use the full size and have the children revert to the `content` section, then use the `container-full-bg` class. This class allows you to maintain the full size while setting your children back to the size of the content. This can be useful for, for example, a background banner that should span the full width.

Finally, you can also create a "cross-section," where you for example start from the full width and end the container at the end of the `content's` width. This can be achieved with the `container-full-content` and `container-full-content-bg` classes, respectively.

All these rules apply similarly for all the subcontainers, but instead of `full`, you should use the name of the defined subcontainer in the configuration. The subcontainers all have their own max-width, which is defined between the full width and the content.

# Configuration options

The configuration options are the same as the default Tailwind container, therefore they can be copied over and used directly.

Additional Features:

## containerPrefix

To customize the prefix name used for all classes, this defaults to `container`. Please ensure to add `container: false` to the corePlugins in your `tailwind.config.js` file as shown below. This will disable the default and override tailwind container class with our class.

```js
  corePlugins: {
    container: false,
  },
```

If you not want to override the default container class or simply want to use another name then override the `containerPrefix` in the plugin options in the `tailwind.config.js`:

```js
  plugins: [
    require("tailwind-grid-container")({
      containerPrefix: 'CONTAINER_PREFIX',
    }),
  ],
```


## subContainers

Subcontainers are a collection of containers that are added between the full-size and content layers. Think of this as an onion where the outer layer is called 'full', the innermost layer is called 'content', and anything in between can be specified with a subcontainer.

These subcontainers are represented as key-value pairs, where the key is the name for the subcontainer and the value is a single or different screensize where the max-width of the container should be set.

```js
plugins: [
  require("tailwind-grid-container")({
    subContainers: {
      // feature: 600
      feature: {
        DEFAULT: 500,
        sm: 740,
        md: 868,
        lg: 1124,
        xl: 1380,
        "2xl": 1636,
      },
    },
  }),
],
```

## baseName

This is the name for the base container. When empty, it will not add a suffix and instead use the `containerPrefix` as the full name. This is the default behavior. For example, when the `containerPrefix` is `container` and the `baseName` is left empty, the base container class will be simply called `container`. If the `baseName` were set to `base`, the class name would become `container-base`.

## backgroundSuffixName

The suffix is used as a background container, where the children use the width of the content instead of the full width of the current container. This defaults to `bg`.

## fullSizeName

The name of the container with the full size defaults to `full`.

# Examples

## HTML

```html
<main class="container">
    <section class="container-full-feature-bg">
        <div class="content"></div>
    </section>

    <section class="container-full-bg">
      <div class="content"></div>
    </section>

    <section class="container-full">
      <div class="content"></div>
    </section>

    <section class="container-feature">
      <div class="container">
        <div class="content"></div>
      </div>
    </section>
<main>
```


## Config

```js
  plugins: [
    // require("../src/index")({ // <- can be used for development while in the tailwind-grid-container package
    require("tailwind-grid-container")({
      // baseName: 'container-base',
      padding: 20,
      // padding: {
      //   DEFAULT: 10,
      //   sm: 10,
      //   lg: 20,
      //   xl: 40,
      //   '2xl': 60,
      // },
      // screens: 400,
      screens: {
        // DEFAULT: 400,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        "2xl": 1536,
      },
      subContainers: {
        // feature: 600
        feature: {
          DEFAULT: 500,
          sm: 740,
          md: 868,
          lg: 1124,
          xl: 1380,
          "2xl": 1636,
        },
      },
    }),
  ],
```

# Resources

This plugin is heavily inspired by:

- [A new approach to container and wrapper classes - Kevin Powell](https://www.youtube.com/watch?v=c13gpBrnGEw&t=704s)
- [Layout Breakouts with CSS Grid](https://ryanmulligan.dev/blog/layout-breakouts/)

## License

[MIT](./LICENSE)
