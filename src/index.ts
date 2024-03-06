import plugin from "tailwindcss/plugin";
import defaultTheme from 'tailwindcss/defaultTheme';

/* Types */
type WidthOption = number | string;

type ScreenSize = keyof typeof defaultTheme.screens | 'DEFAULT' | (string & {}); //'DEFAULT' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | (string & {});
type ScreenOption = Partial<Record<ScreenSize, WidthOption>>;

type SizeOption = WidthOption | ScreenOption;

type Feature = {
    [name: string]: SizeOption;
}

type PluginOptions = {
    containerPrefix?: string // ('container') The prefix used for each container
    baseName?: string; // (default is '') name for the base container 
    fullSizeName?: string; // (default is 'full') name for the full width container inside the base container, this allows the escape the container 
    backgroundSuffixName?: string; // (default is 'bg') name for the background prefix specifier, this allows to escape the container and place the children back inside the container, this mimics the element to be only used as a background 

    subContainers?: Feature; // Sub container width or widths, work the same as screens from the default container

    padding?: SizeOption; // Padding for the container that will always be applied, work the same as the padding from the default container
    screens?: SizeOption; // Max width of the content container inside the base container, work the same as screens from the default container
}


/* Plugin */
const DEFAULT_OPTIONS: Required<Pick<PluginOptions, "baseName" | "fullSizeName" | "backgroundSuffixName" | "containerPrefix">> = {
    containerPrefix: 'container',
    baseName: '',
    fullSizeName: 'full',
    backgroundSuffixName: 'bg',
}

export default plugin.withOptions<PluginOptions>((options) => ({ 
    addComponents,
    corePlugins,
    config
}) => {
    const {
        containerPrefix = DEFAULT_OPTIONS.containerPrefix,
        baseName = DEFAULT_OPTIONS.baseName,
        fullSizeName = DEFAULT_OPTIONS.fullSizeName,
        backgroundSuffixName = DEFAULT_OPTIONS.backgroundSuffixName,
        subContainers,
        screens = (defaultTheme.screens as unknown as ScreenSize),
        padding = 0,
    } = options;

    if (!containerPrefix) throw new Error(`
# Tailwind-grid-container error, 'containerPrefix' can not be empty.

The containerPrefix parameter inside the Tailwind-grid-container plugin can not be an empty value
`)

    if (!fullSizeName) throw new Error(`
# Tailwind-grid-container error, 'fullSizeName' can not be empty.

The fullSizeName parameter inside the Tailwind-grid-container plugin can not be an empty value
`)

    if (corePlugins('container') && containerPrefix === 'container' && baseName === '')
        throw new Error(`
# Tailwind-grid-container error, container class already exists.

By default tailwind-grid-container will try to override your 'container' class.
To make this work tailwinds core container class should be disabled by adding 
the following line to your tailwind.config.js:

corePlugins: {
    container: false,
},

To use a different class name, override the 'containerPrefix' 
property in the tailwind-grid-container plugin:

require("tailwind-grid-container")({
    containerPrefix: 'container-base',
}),`)

    // Add a default of 100% maxWidth for the content when the DEFAULT property is not set
    const contentMaxWidth = (typeof screens !== "object") 
        ? screens 
        : { ...(screens.DEFAULT === undefined ? { DEFAULT: '100%' } : {}), ...screens }; 
    const screensSizes = config().theme?.screens ?? defaultTheme.screens;
    const mediaBreakpoints = useMediaBreakpointsResolver(screensSizes);

    const gridColumnMappings: {subContainerName: string, contentGridName: string}[] = [
        // { name: 'content', value: 'content' },
        { subContainerName: baseName ? baseName : 'content', contentGridName: 'content' },
        { subContainerName: fullSizeName, contentGridName: 'full' },
        ...Object.keys(subContainers ?? {}).map(subContainerName => (
            { subContainerName, contentGridName: subContainerName }
        )),
    ]

    const baseContainerName = baseName ? `${containerPrefix}-${baseName}` : containerPrefix;
    
    addComponents([
        mediaBreakpoints([
            [
                /* Generate the outer padding that will be applied for all screen size breakpoints specified in 'padding' parameter when giving a object instead of a value */
                /* 
                    padding: 10, <- when only a value is applied this will be set for all breakpoints
                    
                    padding : { <- when a object is passed with multiple breakpoints, the padding will be applied for every breakpoint
                        sm: 10
                        md: 20
                    }
                */
                padding,
                p => ({
                    ':root': {
                        /* Padding / gap (has to be set in root to override) */
                    [getPaddingProperty('container')]: getWidth(p)
                    }
                })
],
            [
                                /* Generate the max width for the content inside the container (smallest part and named screens inside the default container)  specified in 'screens; parameter when giving a object instead of a value */
                contentMaxWidth,
                w => ({
                        [`.${baseContainerName}`]: {
                            [getMaxWidthProperty('content')]: getWidth(w),
                        }
                    })
                            ],
            //@ts-ignore
            ...(Object.entries(subContainers ?? {}).map(([subContainerName, subContainerSize]) => ([
                /* Generate sub containers needed css variables for all screen size breakpoints specified in 'subContainers' parameter when giving a object instead of a value */
                /* Sub containers (the blocks are generated based on input from the user, ex:
                    popout: { <- name of the sub container
                        screens: {
                            sm: 600, <- max width when a number is applied a 'px' suffix will be add
                            md: 728,
                            lg: '984px',

                            sm: 'minmax(0, 5rem)' <- string to override default calculation see (--feature-width)
                        }
                    }
                )  */
                subContainerSize,
                (subContainerWidth: WidthOption) => ({
                    [`.${baseContainerName}`]: {
                        [getMaxWidthProperty(subContainerName)]: getWidth(subContainerWidth),
                        [getSideWidthProperty(subContainerName)]: `calc((var(${getMaxWidthProperty(subContainerName)}) - var(${getMaxWidthProperty('content')})) / 2 )`,
                        [getWidthProperty(subContainerName)]: `minmax(0, var(${getSideWidthProperty(subContainerName)}))`
                    }
                })
            ])))
        ]),

        {
            /* Generate the outer padding that will be applied for all screen size breakpoints (this part is split out above to work with every @media (min-width: *)) */

            // .container > *
            [`.${baseContainerName} > *`]: {
                /* Padding removed (remove padding from children to prevent double padding) */
                [getPaddingProperty('container')]: '0px'
            },
            // .container
            [`.${baseContainerName}`]: {
                /* Full */
                [getWidthProperty('full')]: `minmax(var(${getPaddingProperty('container')}), 1fr)`,

                /* Content */
                [getWidthProperty('content')]: `calc(min(var(${getMaxWidthProperty('content')}), 100%) - (var(${getPaddingProperty('container')}) * 2))`,   

                /* Generate sub containers css variables (this part is split out above to work with every @media (min-width: *) that is add in subContainers screens params) */

                /* Generate the grid with sub containers and padding applied*/
                display: 'grid',
                'grid-template-columns': `
                    [full-start] var(${getWidthProperty('full')}) 
                    ${ Object.keys(subContainers ?? {}).map((name) => 
                    //   [feature-start] var(--feature-width)
                        `[${name}-start] var(${getWidthProperty(name)})`
                    ).join('\n') }
                    [content-start] var(${getWidthProperty('content')}) [content-end] 
                    ${ Object.keys(subContainers ?? {}).reverse().map((name) => 
                    //   var(--feature-width) [feature-end]
                        `var(${getWidthProperty(name)}) [${name}-end]`
                    ).join('\n') }
                    var(${getWidthProperty('full')}) [full-end]
                `,
            },

// Children = (fallback from parent)

            /* Set the children default with to the container (use -${backgroundSuffixName} suffix to use the full container width) */
            //   .container > *,
            //   .container-full-bg > *,
            // SHOULD: have everything with -bg > *
            [
                `.${baseContainerName} > *, 
                 .${containerPrefix}-${fullSizeName}-${backgroundSuffixName} > *`
                // .features > *    (All features)
            ]: {
                'grid-column': 'content',
                'display': 'grid',
                'grid-template-columns': 'subgrid',
            },

            /* Full width container */
            //   .container-full > *
            [
                `.${containerPrefix}-${fullSizeName} > *`
            ]: {
                'grid-column': 'full',
                'display': 'grid',
                'grid-template-columns': 'subgrid',
            },

            /* Sub containers */
            // '.container-feature > *'
            ...(Object.keys(subContainers ?? {}).reduce((acc, name) => ({
                ...acc, 
                [`
                    .${containerPrefix}-${name} > *
                `]: {
                    'grid-column': name,
                    'display': 'grid',
                    'grid-template-columns': 'subgrid',
                }
            }), {})),

            // '.container-feature-bg > *'
            ...(Object.keys(subContainers ?? {}).reduce((acc, name) => ({
                ...acc, 
                [`
                    .${containerPrefix}-${name}-bg > *
                `]: {
                    'grid-column': 'content',
                    'display': 'grid',
                    'grid-template-columns': 'subgrid',
                }
            }), {})),


            // Cross sections <- TODO
            /* Generated sub-containers names for grid-columns connected to others */
            // '.container-feature-other': { 
            //     'grid-column': 'feature / full'
            // },
            ...(gridColumnMappings).reduce((acc, { subContainerName: sourceName, contentGridName: sourceGrid }) => ({
                ...acc, 
                ...(gridColumnMappings).reduce((acc, { subContainerName: targetName, contentGridName: targetGrid }) =>
                    sourceName === targetName ? acc : ({
                        ...acc,
                        [`
                            .${containerPrefix}-${sourceName}-${targetName} > *
                        `]: {
                            'grid-column': `${sourceGrid} / ${targetGrid}`,
                            'display': 'grid',
                            'grid-template-columns': 'subgrid',
                        }
                    }), {}),
            }), {}),

            // .container-feature-other-bg
            ...(gridColumnMappings).reduce((acc, { subContainerName: sourceName, contentGridName: sourceGrid }) => ({
                ...acc, 
                ...(gridColumnMappings).reduce((acc, { subContainerName: targetName, contentGridName: targetGrid }) =>
                    sourceName === targetName ? acc : ({
                        ...acc,
                        [`
                            .${containerPrefix}-${sourceName}-${targetName}-${backgroundSuffixName} > *
                        `]: { //
                            'grid-column': 'content',
                            'display': 'grid',
                            'grid-template-columns': 'subgrid',
                        }
                    }), {}),
            }), {}),

            // Feature with full
            /* Covered in the gridColumnMappings
            ...(Object.keys(subContainers ?? {}).reduce((acc, name) => ({
                ...acc,
                [
                    // .container-${sourceName}-${targetName} > *
                    `.${containerPrefix}-${name}-${fullSizeName} > *`
                ]: {
                    'grid-column': `${name} / full`,
                    'display': 'grid',
                    'grid-template-columns': 'subgrid',
                },
            }), {})),

            ...(Object.keys(subContainers ?? {}).reduce((acc, name) => ({
                ...acc,
                [
                    // .container-${targetName}-${sourceName} > *
                    `.${containerPrefix}-${fullSizeName}-${name} > *`
                ]: {
                    'grid-column': `full / ${name}`,
                    'display': 'grid',
                    'grid-template-columns': 'subgrid',
                },
            }), {})),

            ...(Object.keys(subContainers ?? {}).reduce((acc, name) => ({
                ...acc,
                [
                    // .container-${sourceName}-${targetName}-bg > *,
                    // .container-${targetName}-${sourceName}-bg > *
                    `.${containerPrefix}-${name}-${fullSizeName}-${backgroundSuffixName} > *, 
                     .${containerPrefix}-${fullSizeName}-${name}-${backgroundSuffixName} > *`
                ]: {
                    'grid-column': 'content',
                    'display': 'grid',
                    'grid-template-columns': 'subgrid',
                },
            }), {})),
            */


// Parent = (set self) (Parent bg should have column as the name or feature, child should have same as parent unless its -bg then it should be content)

            /* Full width container */
            /* Only full has the choice between background (only full width the background and keep the children content width), because it is based on the whole width with padding. All feature are just segments/stops between full and content */
            //   .container-full,
            //   .container-full-bg,
            [
                `.${containerPrefix}-${fullSizeName},
                 .${containerPrefix}-${fullSizeName}-${backgroundSuffixName}`
            ]: {
                'grid-column': 'full',
                'display': 'grid',
                'grid-template-columns': 'subgrid',
            },

            /* Generated sub-containers names for grid-columns */
            // '.container-feature, .container-feature-bg': {
            //     'grid-column': 'feature'
            // },
            ...(Object.keys(subContainers ?? {}).reduce((acc, name) => ({
                ...acc, 
                [`
                    .${containerPrefix}-${name},
                    .${containerPrefix}-${name}-${backgroundSuffixName}
                `]: {
                    'grid-column': name,
                    'display': 'grid',
                    'grid-template-columns': 'subgrid',
                }
            }), {})),


            // Cross sections
            /* Generated sub-containers names for grid-columns connected to others */
            // '.container-feature-other, .container-feature-other-bg': { 
            //     'grid-column': 'feature / full'
            // },
            ...(gridColumnMappings).reduce((acc, { subContainerName: sourceName, contentGridName: sourceGrid }) => ({
                ...acc, 
                ...(gridColumnMappings).reduce((acc, { subContainerName: targetName, contentGridName: targetGrid }) =>
                    sourceName === targetName ? acc : ({
                        ...acc,
                        [`
                            .${containerPrefix}-${sourceName}-${targetName},
                            .${containerPrefix}-${sourceName}-${targetName}-${backgroundSuffixName} 
                        `]: {
                            'grid-column': `${sourceGrid} / ${targetGrid}`,
                            'display': 'grid',
                            'grid-template-columns': 'subgrid',
                        }
                    }), {}),
            }), {}),

            // Feature with full
            /* Covered in the gridColumnMappings
            ...(Object.keys(subContainers ?? {}).reduce((acc, name) => ({
                ...acc,
                //  .container-${sourceName}-full,
                //  .container-${sourceName}-full-bg
                [`
                    .${containerPrefix}-${name}-${fullSizeName},
                    .${containerPrefix}-${name}-${fullSizeName}-${backgroundSuffixName}
                `]: {
                    'grid-column': `${name} / full`, 
                    'display': 'grid',
                    'grid-template-columns': 'subgrid',
                },

                //  .container-full-${sourceName},
                //  .container-full-${sourceName}-bg
                [`.${containerPrefix}-${fullSizeName}-${name}-${backgroundSuffixName}`]: {
                    'grid-column': `full / ${name}`,
                    'display': 'grid',
                    'grid-template-columns': 'subgrid',
                },
            }), {})),
            */
        }
    ])
})

/* Utils */
/**
 * Wraps the result of the callback for all screen sizes when needed or simply returns with one size
 * Example: given that the callback is: 
 *      w => ({
 *          '.test-class': {
 *               '--test-variable-width': w,
 *           }
 *       })
 * and the screensSizes are:
 *      {
 *          sm: '360px',
 *          md: '720px',
 *      }
 * when sizes is '10px', this will return an object like:
 *      {
 *           '.test-class': {
 *               '--test-variable-width': 10px,
 *           }
 *      }
 * 
 * When sizes is { DEFAULT: 10px, sm: 20px, md: 30% } what will result in a object with 
 *      {
 *           '.test-class': {
 *               '--test-variable-width': 10px,
 *           },
 *           @media (min-width: 360px) : {
 *              '.test-class': {
 *                  '--test-variable-width': 20px,
 *              },
 *           }
 *           @media (min-width: 720px) : {
 *              '.test-class': {
 *                  '--test-variable-width': 30%,
 *              },
 *           }
 *      }
 */
function mediaBreakpointResolver<T extends object>(
    screensSizes: object,
    sizes: SizeOption,
    callBack: (val: WidthOption) => T,
)/*: T | ({DEFAULT: T} & Record<`@media (min-width: ${keyof screensSizes})`, T>)*/ {
    // When it is not of type ScreenOption (not an object width different screen sizes)
    if (typeof sizes !== 'object')
        return callBack(sizes);

    // Should check for default, when default add without media query
    const DEFAULT = sizes.DEFAULT !== undefined ? callBack(sizes.DEFAULT) : {};

    return Object
        .entries(sizes)
        .reduce((acc, [key, val]) => {
            // @ts-ignore
            const breakpoint = screensSizes[key];
            if (breakpoint === undefined || val === undefined || key === 'DEFAULT')
                return acc;
            
            return {
                ...acc,
                [`@media (min-width: ${breakpoint})`] : callBack(val)
            }
        }, DEFAULT)
}

/**
 * Simple wrapper for the mediaBreakpointResolver function to abstract screen sizes
 */
function useMediaBreakpointResolver(screensSizes: object) {
    return <T extends object>(value: SizeOption, callBack: (val: WidthOption) => T) =>
        mediaBreakpointResolver(screensSizes, value, callBack);
} 

/**
 * Simple wrapper for multiple mediaBreakpointResolver function and abstracting screen sizes
 */
function useMediaBreakpointsResolver(screensSizes: object) {
    const mediaBreakpoints = useMediaBreakpointResolver(screensSizes);

    return <T extends object>(params: [value: SizeOption, callBack: (val: WidthOption) => T][]) =>
        deepMergeObjects( params.map( param/*[value, callback]*/ => mediaBreakpoints(...param)))
} 


/**
 * Retrieve the accurate width. 
 * When a numerical value is provided, display it in pixels. 
 * Everything else will be returned as its intended values (e.g., 100%, 10rem, etc.).
 */
function getWidth(width: WidthOption) {
    if (typeof width === "number")
        return `${width}px`;
    return width;
}

/**
 * Get the css variable name from a given prefix and property
 * For example: full-width, feature-padding, feature-max-width
 */
function getCssVariableName(prefix: string, property: string) {
    return `--${prefix}-${property}`
}

/**
 * Retrieve the CSS variable name from a width property with a given prefix ([prefix]-width)
 */
function getWidthProperty(prefix: string) {
    const WIDTH_PROPERTY = 'width';
    return getCssVariableName(prefix, WIDTH_PROPERTY);
}

/**
 * Retrieve the CSS variable name from a side width property with a given prefix ([prefix]-side-width)
 */
function getSideWidthProperty(prefix: string) {
    const WIDTH_PROPERTY = 'side-width';
    return getCssVariableName(prefix, WIDTH_PROPERTY);
}

/**
 * Retrieve the CSS variable name from a max width property with a given prefix ([prefix]-max-width)
 */
function getMaxWidthProperty(prefix: string) {
    const MAX_WIDTH_PROPERTY = 'max-width';
    return getCssVariableName(prefix, MAX_WIDTH_PROPERTY);
}

/**
 * Retrieve the CSS variable name from a padding property with a given prefix ([prefix]-padding)
 */
function getPaddingProperty(prefix: string) {
    const PADDING_PROPERTY = 'padding';
    return getCssVariableName(prefix, PADDING_PROPERTY);
}

/**
 * Merge an array of object to a single object
 */
function deepMergeObjects<T>(objectsArray: T[]) {
    const result = objectsArray.pop() ?? {};
    while (objectsArray.length) {
        let next = objectsArray.pop();
        if (next === null || typeof next !== 'object')
            continue;
        
        Object.keys(next).map((key) => {
            // @ts-ignore
            result[key] = (result[key] && typeof result[key] === 'object')
                // @ts-ignore
                ? deepMergeObjects([result[key], next[key]])
                // @ts-ignore
                : next[key]
        });
    }

    //@ts-ignore
    const ordered = Object.keys(result).sort((a, b) => {
        // Should always be placed as last when a or b has an @ and not the other
        if (a.startsWith('@') !== b.startsWith('@'))
            return a.startsWith('@') ? 1 : -1;

        // : should always be placed first
        if (a.startsWith(':') !== b.startsWith(':'))
            return a.startsWith(':') ? -1 : 1;

        // . should always be placed after tag
        if (a.startsWith('.') !== b.startsWith('.'))
            return a.startsWith('.') ? 1 : -1;

        // Leave it as it is
        // if (a > b) return -1;
        // if (b > a) return 1;
        return 0;
    }).reduce(
        (obj, key) => { 
            //@ts-ignore
            obj[key] = result[key]; 
            return obj;
        }, 
        {}
      );
    console.log('Deep:', ordered);

    return result;
}
