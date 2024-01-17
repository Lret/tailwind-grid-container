import plugin from "tailwindcss/plugin";
import defaultTheme from 'tailwindcss/defaultTheme';

/* Types */
type WidthOption = number | string;

type ScreenSize = keyof typeof defaultTheme.screens | 'DEFAULT' | (string & {}); //'DEFAULT' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | (string & {});
type ScreenOption = Partial<Record<ScreenSize, WidthOption>>;

type SizeOption = WidthOption | ScreenOption

type Feature = {
    [name: string]: SizeOption;
}

type PluginOptions = {
    baseName?: string
    padding: SizeOption;
    screens: SizeOption;
    subContainers?: Feature
}


/* Plugin */
// const DEFAULT_OPTIONS: PluginOptions = {}

export default plugin.withOptions<PluginOptions>((options) => ({
    addBase, 
    addComponents,
    addUtilities,
    config
}) => {
    const screens = config().theme?.screens ?? defaultTheme.screens;
    const { baseName, screens: contentMaxWidth, padding, subContainers } = options;
    const mediaBreakpoints = useMediaBreakpointResolver(screens)
    
    addComponents([
        /* Generate the outer padding that will always be applied for all screen size breakpoints specified in 'padding' parameter when giving a object instead of a value */
        /* 
            padding: 10, <- when only a value is applied this will be set for all breakpoints
            
            padding : { <- when a object is passed with multiple breakpoints, the padding will be applied for every breakpoint
                sm: 10
                md: 20
            }
        */
        mediaBreakpoints(padding, p => ({
            ':root': {
                /* Padding / gap (has to be set in root to override) */
                [getPaddingProperty('container')]: getWidth(p)
            }
        })),

        /* Generate the max width for the content inside the container (smallest part and named screens inside the default container)  specified in 'screens; parameter when giving a object instead of a value */
        mediaBreakpoints(contentMaxWidth, w => ({
            '.container-base': {
                [getMaxWidthProperty('content')]: getWidth(w),
            }
        })),

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
        mergeObjects(Object.entries(subContainers ?? {}).map(([name, value]) => (
            mediaBreakpoints(value, val => ({
                '.container-base': {
                    [getMaxWidthProperty(name)]: getWidth(val),
                    [getSideWidthProperty(name)]: `calc((var(${getMaxWidthProperty(name)}) - var(${getMaxWidthProperty('content')})) / 2 )`,
                    [getWidthProperty(name)]: `minmax(0, var(${getSideWidthProperty(name)}))`
                }
            }))
        ))),

        {
            // @mediaBreakpoint
            /*':root': {
                /* Padding / gap (has to be set in root to override) * /
                '--container-padding': getWidth(padding)
            },*/

            '.container-base > *' : {
                /* Padding removed (remove padding from children to prevent double padding) */
                [getPaddingProperty('container')]: '0px'
            },
            '.container-base': {
                /* Full */
                [getWidthProperty('full')]: `minmax(var(${getPaddingProperty('container')}), 1fr)`,

                /* Content */
                [getWidthProperty('content')]: `min(var(${getMaxWidthProperty('content')}), 100% - (var(${getPaddingProperty('container')}) * 2))`,

                /* Generate sub containers css variables (this part is split out above to work with every @media (min-width: *) that is add in subContainers screens params) */

                /* Generate the grid with sub containers and padding applied*/
                display: 'grid',
                'grid-template-columns': `
                    [full-start] var(${getWidthProperty('full')}) 
                    ${ Object.keys(subContainers ?? {}).map((name) => 
                    //   [feature-start] var(--feature-width)
                        `[${name}-start] var(${getWidthProperty(name)})`
                    ).join('\n') }
                    [content-start] var(${getWidth('content')}) [content-end] 
                    ${ Object.keys(subContainers ?? {}).reverse().map((name) => 
                    //   var(--feature-width) [feature-end]
                        `var(${getWidthProperty(name)}) [${name}-end]`
                    ).join('\n') }
                    var(${getWidthProperty('full')}) [full-end]
                `,
            },
            /* Set the children default with to the container (use -escape suffix to use the full container width) */
            '.container-base > *, .container-full-bg > *': {
                'grid-column': 'content',
            },
            /* Full width container */
            /* Only full has the choice between background (only full width the background and keep the children content width), because it is based on the whole width with paddding. All feature are just segments/stops between full and content */
            '.container-full-bg': {
                display: 'grid',
                'grid-template-columns': 'inherit',
            },
            '.container-full-bg, .container-full': {
                'grid-column': 'full',
            },

            /* Generated sub-containers names for grid-columns */
            // '.container-feature': {
            //     'grid-column': 'feature'
            // },
            ...(Object.keys(subContainers ?? {}).reduce((acc, name) => ({
                ...acc, 
                [`.container-${name}`]: {
                    'grid-column': name
                }
            }), {}))
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
 * and the screens are:
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
    screens: object,
    sizes: SizeOption,
    callBack: (val: WidthOption) => T
) {
    // When it is not of type ScreenOption (not an object width different screen sizes)
    if (typeof sizes !== 'object')
        return callBack(sizes);

    // Should check for default, when default add without media query
    const DEFAULT = sizes.DEFAULT !== undefined ? callBack(sizes.DEFAULT) : {};

    return Object
        .entries(sizes)
        .reduce((acc, [key, val]) => {
            // @ts-ignore
            const breakpoint = screens[key];
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
function useMediaBreakpointResolver(screens: object) {
    return <T extends object>(value: SizeOption, callBack: (val: WidthOption) => T) => mediaBreakpointResolver(screens, value, callBack);
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
 * Retrieve the CSS variable name from a max widht property with a given prefix ([prefix]-max-width)
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
function mergeObjects<T> (objectsArray: T[]) {
    return Object.assign({}, ...objectsArray) as T;
}