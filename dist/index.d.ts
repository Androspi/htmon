import { BehaviorSubject, Subject } from 'rxjs';
export declare type Extension<Basic, Complete> = Complete extends Basic ? Complete : never;
export declare type TemplateBehaviorClass<T = TemplateBehavior.BehaviorOptionList[keyof TemplateBehavior.BehaviorOptionList]> = new (template: IntersectionTypeList['template'], options: T) => TemplateBehaviorProperties<T>;
export interface TemplateBehaviorProperties<T = TemplateBehavior.BehaviorOptionList[keyof TemplateBehavior.BehaviorOptionList]> {
    template: IntersectionTypeList['template'];
    destroy: () => Promise<void>;
    init: () => void;
    options: T;
}
declare class Behavior {
    readonly behaviorList: Partial<TemplateBehavior.BehaviorList>;
    private BEHAVIORLIST;
    use<T = TemplateBehavior.BehaviorOptionList[keyof TemplateBehavior.BehaviorOptionList]>(name: string, behavior: TemplateBehaviorClass<T>): void;
}
export declare const BehaviorOptions: Behavior;
export declare class TemplateOperators {
    static childrenContextTree(rowList: Partial<IntersectionTypeList['context']>[]): Partial<IntersectionTypeList['context']>[];
    static copyOf<T extends object>(reference: T, excludedProperties?: string[]): T;
    static checkIfUseSpecificProperties(context: any, prop?: string): boolean;
    static checkIfUseProperties(context: any): boolean;
    static interpolateVariables(reference: object, context: object, key: string): void;
    static interpolateVariableIf<T extends any>(key: T, propertyList: object): T;
    static templateSelector<T extends IntersectionTypeList['template']>(tree: IntersectionTypeList['template'][], selector: Partial<T>): T;
    static templateSelectorAll<T extends IntersectionTypeList['template']>(tree: IntersectionTypeList['template'][], selector: Partial<T>): T[];
    static getContext<T extends IntersectionTypeList['context']>(context: Partial<IntersectionTypeList['context']>[], selector: Partial<T>): Partial<T>;
    static get<T extends IntersectionTypeList['template']>(tree: IntersectionTypeList['template'][], branch: T | string): T;
    static getControllers<T extends IntersectionTypeList['template']>(tree: IntersectionTypeList['template'][], iterable: string | IterableTemplate, behavior: keyof TemplateBehavior.BehaviorList): T[];
    static createTemplate<T extends IntersectionTypeList['template'], TC extends T['templateContext'] = T['templateContext']>(parent: T['parent'], templateContext: Partial<TC>, methods: T['methods'], componentAttribute?: T['componentAttribute'], rowIndex?: T['rowIndex']): T;
    private static getRows;
    private static checkObject;
}
declare class TemplateTree {
    readonly tree: IntersectionTypeList['template'][];
    private TREE;
    readonly branch: Subject<IntersectionTypeList['template']>;
    private BRANCH;
    add(branch: IntersectionTypeList['template']): number;
    remove(branch: IntersectionTypeList['template']): void;
}
export declare const TemplateOptions: TemplateTree;
export interface TemplateFamily {
    parent: ContainerTemplate | Element;
    target: Element;
}
export interface DOMChangedEvent<T extends IntersectionTypeList['template'] = IntersectionTypeList['template']> {
    type: MutationRecord['type'];
    event: MutationRecord;
    template: T;
}
export interface ReadyEvent<T extends IntersectionTypeList['template'] = IntersectionTypeList['template']> {
    type: T['templateContext']['type'];
    template: T;
}
export interface Callback {
    property?: keyof UnionTypeList['context'];
    source?: string;
    method?: string;
    name?: string;
    dummy?: any;
}
export interface ImportantStyles {
    importantStyles: Record<string, string>;
}
export interface ClosingStyles extends ImportantStyles {
    closeTransitionProperty: string;
    maxWaitTime: number;
}
export interface TemplateNode {
    /** Referencia de un elemento DOM */
    element: Element;
    /**
     * Define si el elmento podrá ser eliminado cuando se destruya el componente
     * @default false
     */
    removable?: boolean;
}
export interface TemplateEvents {
    DOMChanged: Subject<DOMChangedEvent>;
    ready: BehaviorSubject<ReadyEvent>;
    propertyChanges: Subject<void>;
    destroy: Subject<void>;
}
export interface TemplateProperties extends TemplateFamily {
    readonly templateDataContext: TemplateProperties['templateContext'];
    readonly behaviorInstances: Partial<TemplateBehavior.BehaviorList>;
    readonly templateContext: Partial<IntersectionTypeList['context']>;
    readonly parentTree: SomeContainerTemplateTypeList['template'][];
    readonly methods: Record<string, (...params: any[]) => any>;
    readonly propertyTree: Record<string | number, any>;
    readonly propertyList: Record<string | number, any>;
    readonly templateContainer: TemplateFamily;
    readonly parent: TemplateFamily['parent'];
    readonly target: TemplateFamily['target'];
    readonly type: TemplateContext['type'];
    readonly componentAttribute: Attr;
    readonly events: TemplateEvents;
    readonly isDestroyed: boolean;
    readonly root: TemplateTree;
    readonly rowIndex: number;
    closingStyles: Readonly<TemplateContext['closingStyles']>;
    duration: Exclude<TemplateContext['duration'], string>;
    dataContext: Readonly<TemplateContext['dataContext']>;
    properties: Readonly<TemplateContext['dataContext']>;
    attributes: Readonly<TemplateContext['attributes']>;
    styles: Readonly<Partial<CSSStyleDeclaration>>;
    addClasses: TemplateContext['addClasses'];
    callback: TemplateContext['callback'];
    classes: TemplateContext['classes'];
    name: TemplateContext['name'];
    id: TemplateContext['id'];
    loadTemplate: (context: Partial<TemplateContext>, restrict: string[]) => void;
    addMethods: (methodName: string, methodFn: (...params: any[]) => any) => void;
    addEvents: (events: [keyof HTMLElementEventMap | string, Callback][]) => void;
    reload: () => IntersectionTypeList['template'];
    destroy: () => Promise<void>;
    reIndex: () => void;
}
export interface TemplateContext {
    addEvents: [keyof HTMLElementEventMap | string, Callback][];
    closingStyles: Partial<CSSStyleDeclaration & ClosingStyles>;
    type: keyof (TemplateTypeList & ContainerTemplateTypeList);
    parent: Partial<SomeContainerTemplateTypeList['context']>;
    behavior: Partial<TemplateBehavior.BehaviorOptionList>;
    styles: Partial<CSSStyleDeclaration & ImportantStyles>;
    attributes: Record<string, string>;
    dataContext: Record<string, any>;
    duration: string | number;
    target: Partial<Element>;
    callback: Callback[];
    addClasses: string;
    node: TemplateNode;
    classes: string;
    name: string;
    tag: string;
    id: string;
}
export interface GetTemplateEvent {
    callback: (template: IntersectionTypeList['template'] | TemplateTree, params?: GetTemplateEvent['params']) => void;
    params?: Record<string, any>;
}
export declare class Template<T extends TemplateProperties = TemplateProperties, RT extends TemplateContext = TemplateContext> implements TemplateProperties {
    /** Retorna la información almacenada en las propiedades "properties", "dataContext" y "methods" de la plantilla */
    readonly propertyList: T['propertyList'];
    /** Retorna la información almacenada en las propiedad "properties", "dataContext" y "methods" de la plantilla y de su arbol de padres */
    readonly propertyTree: T['propertyTree'];
    readonly parentTree: T['parentTree'];
    readonly parent: T['parent'];
    readonly target: T['target'];
    readonly rowIndex: T['rowIndex'];
    protected ROWINDEX: T['rowIndex'];
    readonly root: T['root'];
    protected ROOT: T['root'];
    readonly isDestroyed: T['isDestroyed'];
    protected ISDESTROYED: T['isDestroyed'];
    readonly templateContainer: T['templateContainer'];
    protected TEMPLATECONTAINER: T['templateContainer'];
    readonly componentAttribute: T['componentAttribute'];
    protected COMPONENTATTRIBUTE: T['componentAttribute'];
    readonly methods: T['methods'];
    protected METHODS: T['methods'];
    readonly templateContext: T['templateContext'];
    protected TEMPLATECONTEXT: T['templateContext'];
    readonly templateDataContext: T['templateDataContext'];
    protected TEMPLATEDATACONTEXT: T['templateDataContext'];
    readonly type: T['type'];
    protected TYPE: T['type'];
    readonly behaviorInstances: T['behaviorInstances'];
    protected BEHAVIORINSTANCES: T['behaviorInstances'];
    readonly events: T['events'];
    protected TEMPLATEEVENTS: TemplateEvents;
    addClasses: T['addClasses'];
    classes: T['classes'];
    attributes: T['attributes'];
    callback: T['callback'];
    protected behavior: RT['behavior'];
    protected DATACONTEXT: T['dataContext'];
    dataContext: T['dataContext'];
    protected PROPERTIES: T['properties'];
    properties: T['properties'];
    protected NAME: T['name'];
    name: T['name'];
    protected CLOSINGSTYLES: T['closingStyles'];
    closingStyles: T['closingStyles'];
    private DURATION;
    duration: T['duration'];
    id: T['id'];
    styles: T['styles'];
    constructor(parent: T['parent'], templateContext: T['templateContext'], methods: T['methods'], tag: RT['tag'], componentAttribute: T['componentAttribute'], rowIndex?: T['rowIndex'], templateContainer?: Partial<T['templateContainer']>, type?: T['type']);
    /**
     * Añade métodos al listado
     * @param methodName Nombre del método
     * @param methodFn Callback
     */
    addMethods(methodName: string, methodFn: (...params: any[]) => any): void;
    addEvents(events: RT['addEvents']): void;
    loadTemplate(context: Partial<TemplateContext>, restrict?: string[]): void;
    reload(): this;
    /**
     * Actualiza la propiedad ROWINDEX de acuerdo a la posición del contexto en la propiedad ROWS de la plantilla padre
     */
    reIndex(): void;
    destroy(): Promise<void>;
    protected checkObject: (element: any) => boolean;
    protected saveContext<P extends keyof T['templateContext']>(property: P, templatecontextValue: RT[P], templateDataContextValue?: RT[P]): void;
    protected removeChildOfParent(): Promise<void>;
    protected setObjects(reference: object, value: object): Promise<void>;
    protected destroyBehaviorInstances(): Promise<void>;
    protected closingStylesAnimation(): Promise<void>;
    private setDuration;
    private setStyles;
    private setTarget;
}
export interface TemplateTypeList {
    template: {
        template: Template<TemplateProperties, TemplateContext>;
        properties: TemplateProperties;
        context: TemplateContext;
    };
}
export interface ChildrenProgressEvent {
    context: ContainerTemplateContext['rows'];
    status: boolean;
}
export interface ContainerTemplateEvents {
    childrenReady: BehaviorSubject<ChildrenProgressEvent>;
    childrenDestroyed: Subject<void>;
    rowAdded: Subject<number>;
}
export interface ContainerTemplateProperties extends TemplateProperties {
    readonly templateContainer: TemplateFamily & {
        children: IntersectionTypeList['template'][];
    };
    readonly templateDataContext: ContainerTemplateProperties['templateContext'];
    readonly templateContext: Partial<SomeContainerTemplateTypeList['context']>;
    readonly events: TemplateProperties['events'] & ContainerTemplateEvents;
    readonly childrenTree: ContainerTemplateProperties['children'];
    readonly children: IntersectionTypeList['template'][];
    rows: ContainerTemplateContext['rows'];
    type: ContainerTemplateContext['type'];
    push: <T extends IntersectionTypeList['template']>(template: T | T['templateContext'], replace?: boolean, index?: number) => T;
    appendChild: <T extends IntersectionTypeList['template']>(child: T['templateContext'], methods?: T['methods']) => T;
    childrenContextTree: (rowList: ContainerTemplateProperties['rows']) => ContainerTemplateProperties['rows'];
    loadTemplate: (context: Partial<ContainerTemplateContext>, restrict: string[]) => void;
    destroyChildren: (children: IntersectionTypeList['template'][]) => Promise<void>;
}
export interface ContainerTemplateContext extends TemplateContext {
    rows: Partial<IntersectionTypeList['context']>[];
    type: keyof ContainerTemplateTypeList;
}
export declare class ContainerTemplate<P extends ContainerTemplateProperties = ContainerTemplateProperties, C extends ContainerTemplateContext = ContainerTemplateContext> extends Template<P, C> implements ContainerTemplateProperties {
    /** Retorna la información almacenada en las propiedad "properties", "dataContext" y "methods" de la plantilla, de su arbol de padres y de su arbol de hijos */
    readonly propertyTree: P['propertyTree'];
    readonly children: P['children'];
    readonly childrenTree: P['childrenTree'];
    readonly events: P['events'];
    protected CONTAINERTEMPLATEEVENTS: ContainerTemplateEvents;
    protected ROWS: P['rows'];
    rows: P['rows'];
    dataContext: P['dataContext'];
    properties: P['properties'];
    constructor(parent: P['parent'], templateContext: P['templateContext'], methods: P['methods'], tag: C['tag'], componentAttribute: P['componentAttribute'], rowIndex?: P['rowIndex'], templateContainer?: Partial<P['templateContainer']>, type?: P['type']);
    childrenContextTree(rowList?: P["rows"]): P['rows'];
    loadTemplate(context: Partial<ContainerTemplateContext>, restrict?: string[]): void;
    /**
     * Añade un elemento a la plantilla
     * @param context Elemento a añadir: Plantilla o contexto de plantilla
     * @param replace Si es verdadero se reemplazara el contenido de la propiedad ROWS en la posición especificada
     * @param index Especifica la posición de la plantilla en donde se añadirá el elemento
     * @returns Elemento añadido
     */
    push<T extends IntersectionTypeList['template']>(context: T | T['templateContext'], replace?: boolean, index?: number): T;
    appendChild: <T extends Template<TemplateProperties, TemplateContext> | ElementTemplate<ElementTemplateProperties, ElementTemplateContext> | ContainerTemplate<ContainerTemplateProperties, ContainerTemplateContext> | IterableTemplate<IterableTemplateProperties, IterableTemplateContext>>(child: T["templateContext"], methods?: Record<string, (...params: any[]) => any>) => T;
    destroyChildren: (children?: (Template<TemplateProperties, TemplateContext> | ElementTemplate<ElementTemplateProperties, ElementTemplateContext> | ContainerTemplate<ContainerTemplateProperties, ContainerTemplateContext> | IterableTemplate<IterableTemplateProperties, IterableTemplateContext>)[]) => Promise<void>;
    destroy(): Promise<void>;
}
export interface ContainerTemplateTypeList {
    container: {
        template: ContainerTemplate<ContainerTemplateProperties, ContainerTemplateContext>;
        properties: ContainerTemplateProperties;
        context: ContainerTemplateContext;
    };
}
export interface ChildrenShownChangesEvent {
    currentChildrenShown: IntersectionTypeList['template'][];
    currentChildrenShownIndex: number;
    lastChildrenShownIndex: number;
    startAt: number;
    length: number;
    slice: number;
    pages: number;
    endAt: number;
}
export interface IterableTemplateEvents {
    childrenShownChanges: Subject<ChildrenShownChangesEvent>;
}
export interface IterableTemplateProperties extends ContainerTemplateProperties {
    readonly templateContainer: ContainerTemplateProperties['templateContainer'] & {
        controller: IntersectionTypeList['template'];
    };
    readonly events: ContainerTemplateProperties['events'] & IterableTemplateEvents;
    readonly templateDataContext: Partial<IterableTemplateContext>;
    readonly templateContext: Partial<IterableTemplateContext>;
    readonly controller: IntersectionTypeList['template'];
    childrenShownChanger: {
        timer: number;
        startAt: number;
        endAt: number;
        pausedAt?: number;
    };
    childrenLength: Exclude<IterableTemplateContext['childrenLength'], string>;
    childrenShown: Exclude<IterableTemplateContext['childrenShown'], string>;
    type: IterableTemplateContext['type'];
    loadTemplate: (context: Partial<IterableTemplateContext>, restrict: string[]) => void;
}
export interface IterableTemplateContext extends ContainerTemplateContext {
    controller: Partial<IntersectionTypeList['context']>;
    childrenLength: number | string;
    childrenShown: number | string;
    type: 'iterable';
}
export declare class IterableTemplate<P extends IterableTemplateProperties = IterableTemplateProperties, C extends IterableTemplateContext = IterableTemplateContext> extends ContainerTemplate<P, C> implements IterableTemplateProperties {
    /** Retorna la información almacenada en las propiedad "properties", "dataContext" y "methods" de la plantilla, de su arbol de padres, de su arbol de hijos y el arbol del controlador */
    readonly propertyTree: P['propertyTree'];
    /** Retorna el arbol de hijos, además del arbol del controlador */
    readonly childrenTree: P['childrenTree'];
    /** Retorna la plantilla del controlador */
    readonly controller: P['controller'];
    readonly events: P['events'];
    protected ITERABLETEMPLATEEVENTS: IterableTemplateEvents;
    dataContext: P['dataContext'];
    properties: P['properties'];
    private CHILDRENSHOWNCHANGER;
    childrenShownChanger: P['childrenShownChanger'];
    rows: P['rows'];
    private CHILDRENLENGTH;
    childrenLength: P['childrenLength'];
    private CHILDRENSHOWN;
    childrenShown: P['childrenShown'];
    constructor(parent: P['parent'], templateContext: Partial<C>, methods: P['methods'], tag?: C['tag'], componentAttribute?: P['componentAttribute'], rowIndex?: P['rowIndex']);
    /**
     * Añade un elemento a la plantilla y actualiza los elementos mostrados
     * Para que el contenido de la plantilla cambie, actualice la propiedad childrenShown
     * @param context Elemento a añadir: Plantilla o contexto de plantilla
     * @param replace Si es verdadero se reemplazara el contenido de la propiedad ROWS en la posición especificada
     * @param index Especifica la posición de la plantilla en donde se añadirá el elemento
     * @returns undefined
     */
    push<T extends IntersectionTypeList['template']>(context: T | T['templateContext'], replace?: boolean, index?: number): T;
    childrenContextTree(rowList?: P["rows"]): P['rows'];
    loadTemplate(context: Partial<IterableTemplateContext>, restrict?: string[]): void;
    destroy(): Promise<void>;
    private setChildrenShown;
}
export interface ContainerTemplateTypeList {
    iterable: {
        template: IterableTemplate<IterableTemplateProperties, IterableTemplateContext>;
        properties: IterableTemplateProperties;
        context: IterableTemplateContext;
    };
}
export interface ElementTemplateProperties extends TemplateProperties {
    readonly templateDataContext: Partial<ElementTemplateContext>;
    readonly templateContext: Partial<ElementTemplateContext>;
    type: ElementTemplateContext['type'];
    text: ElementTemplateContext['text'];
    loadTemplate: (context: Partial<ElementTemplateContext>, restrict: string[]) => void;
}
export interface ElementTemplateContext extends TemplateContext {
    type: 'element';
    text: string;
}
export declare class ElementTemplate<P extends ElementTemplateProperties = ElementTemplateProperties, C extends ElementTemplateContext = ElementTemplateContext> extends Template<P, C> implements ElementTemplateProperties {
    text: P['text'];
    constructor(parent: P['parent'], templateContext: Partial<C>, methods: P['methods'], tag?: C['tag'], componentAttribute?: P['componentAttribute'], rowIndex?: P['rowIndex']);
    loadTemplate(context: Partial<ElementTemplateContext>, restrict?: string[]): void;
    destroy(): Promise<void>;
}
export interface TemplateTypeList {
    element: {
        template: ElementTemplate<ElementTemplateProperties, ElementTemplateContext>;
        properties: ElementTemplateProperties;
        context: ElementTemplateContext;
    };
}
export declare type IntersectionTypeList = TemplateTypeList[keyof TemplateTypeList] | SomeContainerTemplateTypeList;
export declare type UnionTypeList = TemplateTypeList[keyof TemplateTypeList] & SomeContainerTemplateTypeList;
export declare type SomeContainerTemplate = ContainerTemplate<ContainerTemplateProperties, ContainerTemplateContext>;
export declare type SomeContainerTemplateTypeList = ContainerTemplateTypeList[keyof ContainerTemplateTypeList];
export declare type SomeTemplate = Template<TemplateProperties, TemplateContext>;
export interface IterableControllerBehaviorOptions {
    templateContextActive?: IntersectionTypeList['context'];
    action: 'return' | 'advance' | 'trigger';
    childrenShown?: number;
    allowReload?: boolean;
    target: string;
}
declare class IterableControllerBehavior {
    template: Template;
    options: IterableControllerBehaviorOptions;
    constructor(template: Template, options: IterableControllerBehaviorOptions);
    init(): void;
    destroy: () => Promise<void>;
}
export interface IterableTimerControllerBehaviorOptions {
    templateContextInactive?: IntersectionTypeList['context'];
    templateContextActive?: IntersectionTypeList['context'];
    triggerAction?: 'mouse' | 'click';
    target: string;
}
declare class IterableTimerControllerBehavior {
    template: Template;
    options: IterableTimerControllerBehaviorOptions;
    constructor(template: Template, options: IterableTimerControllerBehaviorOptions);
    init(): void;
    destroy: () => Promise<void>;
}
export interface IterableTimerViewerBehaviorOptions {
    formatter?: string | ((date: number, useSeconds: boolean) => string);
    target: string;
}
declare class IterableTimerViewerBehavior {
    template: IntersectionTypeList['template'];
    options: IterableTimerViewerBehaviorOptions;
    private TIMERCHANGER;
    timerChanger: {
        timer: number;
        startAt: number;
        endAt: number;
    };
    constructor(template: IntersectionTypeList['template'], options: IterableTimerViewerBehaviorOptions);
    init(): void;
    destroy: () => Promise<void>;
}
export interface TemplateEvent {
    templateEvent: {
        target: IntersectionTypeList['template'];
        options: Callback;
    };
}
export interface IterableListPreviewBehaviorOptions {
    templateContextInactive?: Partial<IntersectionTypeList['context']>;
    templateContextActive?: Partial<IntersectionTypeList['context']>;
    templateContext?: Partial<IntersectionTypeList['context']>;
    target: string;
}
declare class IterableListPreviewBehavior {
    template: IntersectionTypeList['template'];
    options: IterableListPreviewBehaviorOptions;
    private childrenList;
    private isDestroyed;
    constructor(template: IntersectionTypeList['template'], options: IterableListPreviewBehaviorOptions);
    init(): void;
    destroy: () => Promise<void>;
}
export interface IterableViewerBehaviorOptions {
    target: string;
}
declare class IterableViewerBehavior {
    template: IntersectionTypeList['template'];
    options: IterableViewerBehaviorOptions;
    constructor(template: IntersectionTypeList['template'], options: IterableViewerBehaviorOptions);
    init(): void;
    destroy: () => Promise<void>;
}
declare global {
    namespace TemplateBehavior {
        interface BehaviorList {
            timerController: IterableTimerControllerBehavior;
            iterableController: IterableControllerBehavior;
            timerViewer: IterableTimerViewerBehavior;
            listPreview: IterableListPreviewBehavior;
            iterableViewer: IterableViewerBehavior;
        }
        interface BehaviorOptionList {
            timerController: IterableTimerControllerBehaviorOptions;
            iterableController: IterableControllerBehaviorOptions;
            timerViewer: IterableTimerViewerBehaviorOptions;
            listPreview: IterableListPreviewBehaviorOptions;
            iterableViewer: IterableViewerBehaviorOptions;
        }
    }
}
export {};
