import plugin from "tailwindcss/plugin";
import defaultTheme from 'tailwindcss/defaultTheme';

type WidthOption = number | string;

type Screen = keyof typeof defaultTheme.screens | 'DEFAULT' | (string & {}); //'DEFAULT' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | (string & {});
type ScreenOption = Partial<Record<Screen, WidthOption>>;

type FeatureOption = WidthOption | ScreenOption

type Feature = {
    [name: string]: FeatureOption;
}

type Options = {
    baseName?: string
    padding: FeatureOption;
    maxWidth: FeatureOption;
    subContainers?: Feature
}

// const DEFAULT_OPTIONS: Options = {}

export default plugin.withOptions<Options>((options) => ({
    addBase, 
    addComponents,
    addUtilities,
    config
}) => {
    const screens = config().theme?.screens ?? defaultTheme.screens;
    const { baseName, maxWidth, padding, subContainers } = options;
    const mediaBreakpoint = <T extends object>(value: FeatureOption, callBack: (val: WidthOption) => T) => screenResolver(screens, value, callBack);

    addComponents([
        mediaBreakpoint(padding, p => ({
            ':root': {
                /* Padding / gap (has to be set in root to override) */
                '--container-padding': getWidth(p)
            }
        })),
        mediaBreakpoint(maxWidth, w => ({
            '.container-base': {
                '--content-max-width': getWidth(w),
            }
        })),
        mergeObjects(Object.entries(subContainers ?? {}).map(([name, value]) => (
            mediaBreakpoint(value, val => ({
                '.container-base': {
                    [`--${name}-max-width`]: getWidth(val),
                    [`--${name}-side-width`]: `calc((var(--${name}-max-width) - var(--content-max-width)) / 2 )`,
                    [`--${name}-width`]: `minmax(0, var(--${name}-side-width))`
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
                '--container-padding': '0px'
            },
            '.container-base': {
                /* Full */
                '--full-width': 'minmax(var(--container-padding), 1fr)',

                /* Content */
                // @mediaBreakpoint
                /*'--content-max-width': getWidth(maxWidth),*/ 
                '--content-width': 'min(var(--content-max-width), 100% - (var(--container-padding) * 2))',

                /* Features (the blocks are generated based on input from the user, ex: 
                    popout: {
                        screens: {
                        sm: 600, <- max width, in number ?or px suffix?
                        md: 728,
                        lg: '984px',

                        sm: 'minmax(0, 5rem)' <- string to override default calculation see (--feature-width)
                        }
                    }
                )  */
                // @mediaBreakpoint
                /*
                ...mergeObjects(Object.entries(subContainers ?? {}).map(([name, value]) => {
                    // if (typeof value === 'string')
                    //     return { [`--${name}-max-width`]: value }; 

                    return ({
                        [`--${name}-max-width`]: getWidth(value), // Should be in base, change based on sm, md, ect?
                        [`--${name}-side-width`]: `calc((var(--${name}-max-width) - var(--content-max-width)) / 2 )`,
                        [`--${name}-width`]: `minmax(0, var(--${name}-side-width))`
                    });
                })),
                */

                display: 'grid',
                'grid-template-columns': `
                    [full-start] var(--full-width) 
                    ${ Object.keys(subContainers ?? {}).map((name) => 
                    //   [feature-start] var(--feature-width)
                        `[${name}-start] var(--${name}-width)` // Use function for this var names
                    ).join('\n') }
                    [content-start] var(--content-width) [content-end] 
                    ${ Object.keys(subContainers ?? {}).reverse().map((name) => 
                    //   var(--feature-width) [feature-end]
                        `var(--${name}-width) [${name}-end]` // Use function for this var names
                    ).join('\n') }
                    var(--full-width) [full-end]
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
            /* Generated Features */
            // '.container-feature': {
            //     'grid-column': 'feature'
            // },
            // ...{...Object.keys(subContainers ?? {}).map(name => ({
            //     [`.container-${name}`]: {
            //         'grid-column': name,
            //     }
            // }))}
            ...(Object.keys(subContainers ?? {}).reduce((acc, name) => ({
                ...acc, 
                [`.container-${name}`]: { 'grid-column': name }
            }), {}))
        }
    ])
})


/* Utils */
// screenResolver(p => ({'--container-padding': getWidth(p)}))
function screenResolver<T extends object>(
    screens: object,
    value: FeatureOption,
    callBack: (val: WidthOption) => T
) {
    if (typeof value !== 'object')
        return callBack(value);

    // Should check for default, when default add without media query
    const DEFAULT = value.DEFAULT !== undefined ? callBack(value.DEFAULT) : {};

    return Object
        .entries(value)
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

// function callFnWithArgs (callback: (...args: ReturnType<typeof getArgs>) => void) {
//     callback(...getArgs())
//   }

// screenResolver(p => ({}));

function getWidth(width: WidthOption) {
    if (typeof width === "number")
        return `${width}px`;
    return width;
}

function getVar(name: string, property: string) {
    return `--${name}-${property}`
}

function mergeObjects<T> (objectsArray: T[]) {
    return Object.assign({}, ...objectsArray) as T;
}

function getWidthProperty(name: string) {
    const WIDTH_PROPERTY = 'width';
    return getVar(name, WIDTH_PROPERTY);
}

function getMaxWidthProperty(name: string) {
    const MAX_WIDTH_PROPERTY = 'max-width';
    return getVar(name, MAX_WIDTH_PROPERTY);
}

function getPaddingProperty(name: string) {
    const PADDING_PROPERTY = 'padding';
    return getVar(name, PADDING_PROPERTY);
}