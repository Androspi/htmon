import { BehaviorSubject, Subject } from 'rxjs';
import { first } from 'rxjs/operators';

export type Extension<Basic, Complete> = Complete extends Basic ? Complete : never;

// Behavior
export type TemplateBehaviorClass<T = TemplateBehavior.BehaviorOptionList[keyof TemplateBehavior.BehaviorOptionList]> = new (template: IntersectionTypeList['template'], options: T) => TemplateBehaviorProperties<T>;
export interface TemplateBehaviorProperties<T = TemplateBehavior.BehaviorOptionList[keyof TemplateBehavior.BehaviorOptionList]> {
  template: IntersectionTypeList['template'];
  destroy: () => Promise<void>;
  init: () => void;
  options: T;
}

class Behavior {

  public get behaviorList(): Partial<TemplateBehavior.BehaviorList> { return this.BEHAVIORLIST; }
  private BEHAVIORLIST: Partial<TemplateBehavior.BehaviorList> = {};

  public use<T = TemplateBehavior.BehaviorOptionList[keyof TemplateBehavior.BehaviorOptionList]>(name: string, behavior: TemplateBehaviorClass<T>) {
    name in this.BEHAVIORLIST ? (console.warn(`behavior (${name}) already exists`)) : this.BEHAVIORLIST[name] = behavior;
  }

}

export const BehaviorOptions = new Behavior();

// TemplateOperators
export class TemplateOperators {

  static childrenContextTree(rowList: Partial<IntersectionTypeList['context']>[]): Partial<IntersectionTypeList['context']>[] {
    return rowList.reduce((list, child): Partial<IntersectionTypeList['context']>[] => {
      return [...list, child, ...('rows' in child ? TemplateOperators.childrenContextTree(child.rows) : [])];
    }, []);
  }

  static copyOf<T extends object>(reference: T, excludedProperties: string[] = []): T {
    return Object.keys(reference).reduce((copy: Partial<T>, key): Partial<T> => {
      if (!excludedProperties.includes(key)) {
        copy[key] = typeof reference[key] === 'object' && reference[key] !== null ? this.copyOf(reference[key], excludedProperties) : reference[key];
      }
      return copy;
    }, Array.isArray(reference) ? [] : {}) as T;
  }

  static checkIfUseSpecificProperties(context: any, prop?: string): boolean {
    if (typeof context === 'object' && context !== null) {
      return Object.keys(context).some(key => this.checkIfUseSpecificProperties(context[key], prop));
    } else if (typeof context === 'string') {
      const matches = context.match(prop !== undefined ? new RegExp(`{{.*${prop}.*}}`, 'g') : /{{.*?}}/g);
      return matches !== null;
    }
  }

  static checkIfUseProperties(context: any): boolean {
    if (typeof context === 'object' && context !== null) {
      return Object.keys(context).some(key => this.checkIfUseProperties(context[key]));
    } else if (typeof context === 'string') {
      const matches = context.match(/{{.*?}}/g);
      return matches !== null;
    }
  }

  static interpolateVariables(reference: object, context: object, key: string) {
    if (typeof context === 'object' && context !== null) {
      if (typeof context[key] === 'object' && context[key] !== null) {
        Object.keys(context[key]).forEach(k => this.interpolateVariables(reference, context[key], k));
      } else if (typeof context[key] === 'string') {
        const matches = context[key].match(/{{.*?}}/g);
        matches !== null && matches.map(res => res.replace(/{{|}}/g, '')).forEach(item => {
          let result: string;
          try {
            // tslint:disable: no-eval
            const variableBlackList = ['TemplateTree', 'TemplateOptions', 'Template', 'ContainerTemplate', 'IterableTemplate', 'ElementTemplate', 'IterableControllerBehavior', 'IterableTimerControllerBehavior', 'IterableTimerViewerBehavior', 'IterableListPreviewBehavior', 'TemplateOperators', 'BehaviorOptions', 'Behavior', 'reference', 'context', 'key', 'matches', 'result', 'variableList', 'item', 'variableBlackList'];
            let variableList = '';
            Object.keys(reference).forEach(k => {
              if (!variableBlackList.includes(k)) {
                variableList = `${variableList} const ${k} = reference["${k}"];`;
                variableBlackList.push(k);
              } else { console.warn(`variable declaration ${k} is not available`); }
            });
            result = eval(`(function () { ${variableList} return ${item} })();`);
            // tslint:enable: no-eval
          } catch (error) { result = new Error(error).message; }
          context[key] = context[key].replace(`{{${item}}}`, result);
        });
      }
    }
  }

  static interpolateVariableIf<T extends any>(key: T, propertyList: object): T {
    const context = this.copyOf({ key });
    this.checkIfUseProperties(context.key) && TemplateOperators.interpolateVariables(propertyList, context, 'key');
    return context.key;
  }

  static templateSelector<T extends IntersectionTypeList['template']>(tree: IntersectionTypeList['template'][], selector: Partial<T>): T {
    return tree.find(branch => {
      return Object.entries(selector).every(([key, value]) => key in branch ? this.checkObject(branch[key], value) : false);
    }) as T;
  }

  static templateSelectorAll<T extends IntersectionTypeList['template']>(tree: IntersectionTypeList['template'][], selector: Partial<T>): T[] {
    return tree.filter((branch) => {
      return Object.entries(selector).every(([key, value]) => key in branch ? this.checkObject(branch[key], value) : false);
    }) as T[];
  }

  static getContext<T extends IntersectionTypeList['context']>(context: Partial<IntersectionTypeList['context']>[], selector: Partial<T>): Partial<T> {
    const contextList = this.getRows<T>(context);
    return contextList.find(item => {
      return Object.entries(selector).every(([key, value]) => key in item ? this.checkObject(item[key], value) : false);
    });
  }

  static get<T extends IntersectionTypeList['template']>(tree: IntersectionTypeList['template'][], branch: T | string): T {
    return tree.find(item => (branch instanceof Template ? item : item.id) === branch) as T;
  }

  static getControllers<T extends IntersectionTypeList['template']>(tree: IntersectionTypeList['template'][], iterable: string | IterableTemplate, behavior: keyof TemplateBehavior.BehaviorList): T[] {
    type IterableBehaviorOptions = IterableTimerControllerBehaviorOptions | IterableControllerBehaviorOptions | IterableTimerViewerBehaviorOptions | IterableListPreviewBehaviorOptions;
    const root = iterable instanceof IterableTemplate ? iterable : this.get<IterableTemplate>(tree, iterable);
    return tree.filter(branch => behavior in branch.behaviorInstances && (branch.behaviorInstances[behavior].options as IterableBehaviorOptions).target === root.id) as T[];
  }

  static createTemplate<T extends IntersectionTypeList['template'], TC extends T['templateContext'] = T['templateContext']>(
    parent: T['parent'],
    templateContext: Partial<TC>,
    methods: T['methods'],
    componentAttribute?: T['componentAttribute'],
    rowIndex: T['rowIndex'] = 0
  ): T {
    switch (templateContext.type) {
      case 'container':
        return new ContainerTemplate(parent, templateContext as any, methods, templateContext?.tag, componentAttribute, rowIndex, {}, 'container') as T;
      case 'iterable':
        return new IterableTemplate(parent, templateContext as any, methods, templateContext.tag, componentAttribute, rowIndex) as T;
      case 'element':
        return new ElementTemplate(parent, templateContext as any, methods, templateContext.tag, componentAttribute, rowIndex) as T;
      default:
        return new Template(parent, templateContext, methods, templateContext?.tag, componentAttribute, rowIndex, {}, 'template') as T;
    }
  }

  private static getRows<T extends IntersectionTypeList['context']>(children: Partial<IntersectionTypeList['context']>[]): Partial<T>[] {
    return children.reduce((pre: Partial<T>[], child) => {
      return [...pre, child, ...('rows' in child ? this.getRows<T>(child.rows) : [])];
    }, []) as Partial<T>[];
  }

  private static checkObject(key: any, value: any): boolean {
    if (key !== undefined && typeof value === 'object' && value !== null) {
      return Object.entries(value).every(([k, v]) => k in key ? this.checkObject(key[k], v) : false);
    } else { return key === value; }
  }

}

// TemplateTree

class TemplateTree {

  public get tree(): IntersectionTypeList['template'][] { return this.TREE; }
  private TREE: IntersectionTypeList['template'][] = [];

  public get branch(): Subject<IntersectionTypeList['template']> { return this.BRANCH; }
  private BRANCH: Subject<IntersectionTypeList['template']> = new Subject();

  add(branch: IntersectionTypeList['template']): number {
    branch.events.ready.pipe(first(ref => ref.template instanceof Template)).subscribe({ next: () => this.BRANCH.next(branch) });
    return this.TREE.push(branch);
  }

  remove(branch: IntersectionTypeList['template']) {
    const rootIndex = this.TREE.indexOf(branch);
    rootIndex >= 0 ? this.TREE.splice(rootIndex, 1) : null;
  }

}

export const TemplateOptions = new TemplateTree();

// Template

export interface TemplateFamily {
  parent: SomeContainerTemplateTypeList['template'] | Element;
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
  styles: Readonly<Omit<TemplateContext['styles'], keyof ImportantStyles>>;
  closingStyles: Readonly<TemplateContext['closingStyles']>;
  dataContext: Readonly<TemplateContext['dataContext']>;
  properties: Readonly<TemplateContext['dataContext']>;
  attributes: Readonly<TemplateContext['attributes']>;
  duration: Exclude<TemplateContext['duration'], string>;
  addClasses: TemplateContext['addClasses'];
  callback: TemplateContext['callback'];
  classes: TemplateContext['classes'];
  name: TemplateContext['name'];
  id: TemplateContext['id'];
  loadTemplate: (context: Partial<IntersectionTypeList['context']>, restrict: string[]) => void;
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

export class Template<T extends TemplateProperties = TemplateProperties, RT extends TemplateContext = TemplateContext> implements TemplateProperties {
  // READONLY
  /** Retorna la información almacenada en las propiedades "properties", "dataContext" y "methods" de la plantilla */
  public get propertyList(): T['propertyList'] { return { templateRef: this, ...this.properties, ...this.dataContext, methods: this.METHODS }; }
  /** Retorna la información almacenada en las propiedad "properties", "dataContext" y "methods" de la plantilla y de su arbol de padres */
  public get propertyTree(): T['propertyTree'] {
    const properties: Record<string | number, any> = this.propertyList;
    if (this.parent instanceof ContainerTemplate) {
      properties.getParentTree = () => this.parentTree.reduce((prop: Record<string, any>, parent) => ({ ...prop, [parent.id]: parent.propertyTree }), {});
      properties.getParent = () => (this.parent as ContainerTemplate).propertyTree;
    } else { properties.getParentTree = () => ({}); properties.getParent = () => undefined; }
    return properties;
  }
  public get parentTree(): T['parentTree'] {
    if (!this.ISDESTROYED) {
      const getParent = (parent: T['parent'], list: T['parentTree']): T['parentTree'] => {
        return parent instanceof ContainerTemplate ? getParent(parent.parent, [...list, parent]) : list;
      };
      return getParent(this.parent, []);
    } else { return undefined; }
  }

  public get parent(): T['parent'] { return !this.ISDESTROYED && this.TEMPLATECONTAINER ? this.TEMPLATECONTAINER.parent : undefined; }

  public get target(): T['target'] { return !this.ISDESTROYED && this.TEMPLATECONTAINER ? this.TEMPLATECONTAINER.target : undefined; }
  // GETTERS
  public get rowIndex(): T['rowIndex'] { return this.ROWINDEX; }
  protected ROWINDEX: T['rowIndex'];

  public get root(): T['root'] { return !this.ISDESTROYED ? this.ROOT : undefined; }
  protected ROOT: T['root'];

  public get isDestroyed(): T['isDestroyed'] { return this.ISDESTROYED; }
  protected ISDESTROYED: T['isDestroyed'] = false;

  public get templateContainer(): T['templateContainer'] { return !this.ISDESTROYED ? this.TEMPLATECONTAINER : undefined; }
  protected TEMPLATECONTAINER: T['templateContainer'] = undefined;

  public get componentAttribute(): T['componentAttribute'] { return !this.ISDESTROYED ? this.COMPONENTATTRIBUTE : undefined; }
  protected COMPONENTATTRIBUTE: T['componentAttribute'];

  public get methods(): T['methods'] { return !this.ISDESTROYED ? this.METHODS : undefined; }
  protected METHODS: T['methods'] = {};

  public get templateContext(): T['templateContext'] { return !this.ISDESTROYED ? this.TEMPLATECONTEXT : undefined; }
  protected TEMPLATECONTEXT: T['templateContext'] = {};

  public get templateDataContext(): T['templateDataContext'] { return !this.ISDESTROYED ? this.TEMPLATEDATACONTEXT : undefined; }
  protected TEMPLATEDATACONTEXT: T['templateDataContext'] = {};

  public get type(): T['type'] { return !this.ISDESTROYED ? this.TYPE : undefined; }
  protected TYPE: T['type'] = undefined;

  public get behaviorInstances(): T['behaviorInstances'] { return this.BEHAVIORINSTANCES; }
  protected BEHAVIORINSTANCES: T['behaviorInstances'] = {};

  public get events(): T['events'] { return !this.ISDESTROYED ? this.TEMPLATEEVENTS : undefined; }
  protected TEMPLATEEVENTS: TemplateEvents = {
    ready: new BehaviorSubject<ReadyEvent>({ template: undefined, type: undefined }),
    propertyChanges: new Subject(),
    DOMChanged: new Subject(),
    destroy: new Subject()
  };
  // SETTERS
  public set addClasses(val: T['addClasses']) {
    if (!this.ISDESTROYED && this.target) {
      this.saveContext('addClasses', val);
      const classList = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
      this.TEMPLATEDATACONTEXT.addClasses = classList;
      this.target.classList.add(...classList.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ').split(' '));
    }
  }

  public set classes(val: T['classes']) {
    if (!this.ISDESTROYED && this.target) {
      this.saveContext('classes', val);
      const classList = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
      this.TEMPLATEDATACONTEXT.classes = classList;
      this.target.setAttribute('class', classList.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' '));
    }
  }

  public set attributes(val: T['attributes']) {
    if (!this.ISDESTROYED && this.target) {
      const attributes = { ...(this.TEMPLATECONTEXT.attributes || {}), ...val };
      this.saveContext('attributes', attributes);
      const attributeList = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
      this.TEMPLATEDATACONTEXT.attributes = { ...(this.TEMPLATEDATACONTEXT.attributes || {}), ...attributeList };
      Object.entries(attributeList).forEach(item => this.target.setAttribute(item[0], item[1]));
    }
  }

  public set callback(val: T['callback']) {
    if (!this.ISDESTROYED) {
      this.saveContext('callback', val);
      const callbacks = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
      this.TEMPLATEDATACONTEXT.callback = callbacks;
      const getPromise = (index: number) => {
        if (index in callbacks) {
          const options: Callback = callbacks[index];
          if (options.name) {
            if (options.name in this.METHODS) {
              this.METHODS[options.name](this, options).then(response => {
                this.checkObject(response) ? (this.loadTemplate(response, [])) : null;
              }).finally(() => getPromise(++index));
            } else { console.warn(`method ${options.name} does not exist`); }
          } else if (options.method && options.method in this.METHODS) {
            this.METHODS[options.method](options.source).subscribe(response => {
              this.loadTemplate({ [options.property]: response }, []);
              getPromise(++index);
            });
          } else { console.warn('"method.name" must be defined'); getPromise(++index); }
        }
      };
      getPromise(0);
    }
  }
  // PROTECTED SETTERS
  protected set behavior(val: RT['behavior']) {
    if (!this.ISDESTROYED && val !== undefined) {
      this.saveContext('behavior', val, val);
      Object.entries(val).forEach(([behavior, options], idx) => {
        if (behavior in BehaviorOptions.behaviorList) {
          (async () => {
            behavior in this.BEHAVIORINSTANCES && await this.BEHAVIORINSTANCES[behavior].destroy();
            this.BEHAVIORINSTANCES[behavior] = new BehaviorOptions.behaviorList[behavior](this, options || {});
          })();
        } else { console.warn(`behavior (${behavior}) is not defined`); }
      });
    }
  }
  // GETTERS AND SETTERS
  protected DATACONTEXT: T['dataContext'] = {};
  public get dataContext(): T['dataContext'] { return this.ISDESTROYED === false ? this.DATACONTEXT : undefined; }
  public set dataContext(val: T['dataContext']) {
    if (!this.ISDESTROYED) {
      this.DATACONTEXT = { ...this.DATACONTEXT, ...val };
      this.saveContext('dataContext', this.DATACONTEXT, this.DATACONTEXT);
      this.events.propertyChanges.next();
    }
  }

  protected PROPERTIES: T['properties'] = {};
  public get properties(): T['properties'] { return this.ISDESTROYED === false ? this.PROPERTIES : undefined; }
  public set properties(val: T['properties']) {
    if (!this.ISDESTROYED) {
      this.PROPERTIES = { ...this.PROPERTIES, ...val };
      this.events.propertyChanges.next();
    }
  }

  protected NAME: T['name'];
  public get name(): T['name'] { return !this.ISDESTROYED ? this.NAME : undefined; }
  public set name(val: T['name']) {
    if (!this.ISDESTROYED) {
      this.saveContext('name', val);
      this.NAME = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
      this.TEMPLATEDATACONTEXT.name = this.NAME;
    }
  }

  protected CLOSINGSTYLES: T['closingStyles'];
  public get closingStyles(): T['closingStyles'] { return !this.ISDESTROYED ? this.CLOSINGSTYLES : undefined; }
  public set closingStyles(val: T['closingStyles']) {
    if (!this.ISDESTROYED) {
      this.saveContext('closingStyles', val);
      this.CLOSINGSTYLES = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
      this.TEMPLATEDATACONTEXT.closingStyles = this.CLOSINGSTYLES;
    }
  }

  private DURATION: T['duration'] = null;
  public get duration(): T['duration'] { return !this.ISDESTROYED ? this.DURATION : undefined; }
  public set duration(val: T['duration']) { !this.ISDESTROYED && this.setDuration(val); }
  // GETTERS AND SETTERS LINK
  public get id(): T['id'] { return !this.ISDESTROYED && this.target ? this.target.id : undefined; }
  public set id(val: T['id']) {
    if (!this.ISDESTROYED && this.target) {
      this.saveContext('id', val);
      this.target.id = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
      this.TEMPLATEDATACONTEXT.id = this.target.id;
    }
  }

  public set styles(val: T['styles']) { !this.ISDESTROYED && this.setStyles(val); }
  public get styles(): T['styles'] { return !this.ISDESTROYED && this.target ? (this.target instanceof HTMLElement ? this.target.style : {}) : undefined; }
  // CONSTRUCTOR
  constructor(
    parent: T['parent'],
    templateContext: T['templateContext'],
    methods: T['methods'],
    tag: RT['tag'],
    componentAttribute: T['componentAttribute'],
    rowIndex: T['rowIndex'] = 0,
    templateContainer: Partial<T['templateContainer']> = {},
    type: T['type'] = 'template'
  ) {
    this.TEMPLATECONTAINER = { parent: undefined, target: undefined, ...templateContainer };
    this.TYPE = templateContext.type || type;
    this.ROWINDEX = rowIndex;
    Object.entries(templateContext).filter(([name]) => !['addEvents', 'callback', 'behavior'].includes(name)).forEach(([key, value]) => this.saveContext(key as keyof T['templateContext'], value as RT[keyof T['templateContext']]));
    'type' in templateContext ? this.saveContext('type', templateContext.type, templateContext.type) : this.saveContext('type', type, type);
    'node' in templateContext && this.saveContext('node', templateContext.node, templateContext.node);
    'tag' in templateContext && this.saveContext('tag', templateContext.tag, templateContext.tag);

    const templateId = `node-${TemplateOptions.add(this)}`;
    this.TEMPLATECONTAINER.target = templateContext.node?.element || document.createElement(tag || 'div');
    this.TEMPLATECONTAINER.target.id = this.TEMPLATECONTAINER.target.getAttribute('id') || templateContext.id || templateId;
    this.TEMPLATECONTAINER.parent = parent;
    this.saveContext('id', this.TEMPLATECONTAINER.target.id, this.TEMPLATECONTAINER.target.id);

    if (parent instanceof ContainerTemplate) {
      !Array.from(parent.target.children).includes(this.target) && parent.target.appendChild(this.TEMPLATECONTAINER.target);
      !componentAttribute ? componentAttribute = parent.componentAttribute : null;
      methods = !methods ? parent.methods : { ...parent.methods, ...methods };
      parent.children.push(this);
    } else if (parent instanceof Element) { parent.appendChild(this.TEMPLATECONTAINER.target); }

    this.COMPONENTATTRIBUTE = componentAttribute;
    this.METHODS = methods;

    componentAttribute instanceof Attr ? (this.TEMPLATECONTAINER.target.setAttribute(componentAttribute.name, componentAttribute.value)) : null;

    this.ROOT = parent instanceof Template ? parent.root : new TemplateTree();
    this.ROOT.add(this);

    this.target.addEventListener('getTemplate', (ev: CustomEvent<GetTemplateEvent>) => {
      if ('callback' in ev.detail && typeof ev.detail.callback === 'function') { ev.detail.callback(this, ev.detail.params); }
    });

    if (this.parent instanceof Element) {
      this.parent.addEventListener('getTemplate', (ev: CustomEvent<GetTemplateEvent>) => {
        if ('callback' in ev.detail && typeof ev.detail.callback === 'function') { ev.detail.callback(this.ROOT, ev.detail.params); }
      });
    }

    if (type === 'template') {
      this.loadTemplate(templateContext);
      this.events.ready.next({ template: this, type: 'template' });
    }

    this.events.propertyChanges.subscribe({
      next: () => {
        const excludedProperties = ['rows', 'controller', 'parent', 'behavior', 'node', 'dataContext'];
        const context = TemplateOperators.copyOf(this.TEMPLATECONTEXT, excludedProperties);
        Object.keys(context).filter(key => !excludedProperties.includes(key)).forEach(key => {
          TemplateOperators.checkIfUseProperties(context[key]) && this.loadTemplate({ [key]: context[key] });
        });
      }
    });

    const observer = new MutationObserver(mutationsList => {
      for (const mutation of mutationsList) { mutation.type === 'childList' && this.events.DOMChanged.next({ template: this, type: 'childList', event: mutation }); }
    });
    this.events.destroy.subscribe(() => observer.disconnect());
    observer.observe(this.target, { attributes: false, childList: true, subtree: false });
  }
  // PUBLIC METHODS
  /**
   * Añade métodos al listado
   * @param methodName Nombre del método
   * @param methodFn Callback
   */
  public addMethods(methodName: string, methodFn: (...params: any[]) => any) {
    (this.METHODS as Record<string, (...params: any[]) => any>)[methodName] = methodFn;
  }
  public addEvents(events: RT['addEvents']) {
    if (!this.ISDESTROYED) {
      const addEvents = [...(this.TEMPLATECONTEXT.addEvents || []), ...events];
      this.saveContext('addEvents', addEvents, addEvents);
      events.forEach(params => {
        if (this.target && params.length > 1) {
          const options: Callback = params[1];
          if (options.name) {
            if (options.name in this.METHODS) {
              this.target.addEventListener(params[0], event => !this.ISDESTROYED && this.METHODS[options.name](Object.assign(event, { templateEvent: { target: this, options } })));
            } else { console.warn(`method ${options.name} does not exist`); }
          } else { console.warn('"method.name" must be defined'); }
        }
      });
    }
  }

  public loadTemplate(context: Partial<IntersectionTypeList['context']>, restrict: string[] = []) {
    if (!this.ISDESTROYED && ![null, undefined].includes(context)) {
      if ('name' in context) { this.name = context.name; }
      if ('dataContext' in context) { this.dataContext = context.dataContext; }
      if ('parent' in context && this.parent instanceof ContainerTemplate) {
        this.saveContext('parent', context.parent, context.parent);
        this.parent.loadTemplate(context.parent as unknown, ['rows', 'childrenShown', 'callback']);
      }
      if ('closingStyles' in context) { this.closingStyles = context.closingStyles; }
      if ('styles' in context && this.target) { this.setStyles(context.styles); }
      if ('classes' in context && this.target) { this.classes = context.classes; }
      if ('addClasses' in context && this.target) { this.addClasses = context.addClasses; }
      if ('attributes' in context && this.target) { this.attributes = context.attributes; }
      if ('id' in context && (!restrict.includes('id')) && this.target) { this.id = context.id; }
      if ('text' in context && this.target && this instanceof ElementTemplate) { this.text = context.text; }
      if ('target' in context && this.target) { this.setTarget(context.target); }
      if ('rows' in context && (!restrict.includes('rows')) && this instanceof ContainerTemplate) { this.rows = context.rows; }
      if ('childrenShown' in context && (!restrict.includes('childrenShown')) && this instanceof IterableTemplate) { this.childrenShown = context.childrenShown; }
      if ('controller' in context && this instanceof IterableTemplate) {
        this.saveContext('controller', context.controller, context.controller);
        this.controller && this.controller.loadTemplate(context.controller as unknown, []);
      }
      if ('duration' in context && (!restrict.includes('duration'))) { this.setDuration(context.duration); }
      if ('callback' in context && (!restrict.includes('callback'))) { this.callback = context.callback; }
      if ('addEvents' in context) { this.addEvents(context.addEvents); }
      if ('behavior' in context) { this.behavior = context.behavior; }
    }
  }

  public reload(): this {
    const [context, methods, attr, rowIndex] = [this.TEMPLATECONTEXT, this.METHODS, this.COMPONENTATTRIBUTE, this.ROWINDEX];
    const parent = this.parent;
    if (parent instanceof HTMLElement) {
      const sibling = this.target.nextElementSibling;
      this.destroy();
      const template = TemplateOperators.createTemplate<this>(parent, context, methods, attr, rowIndex);
      sibling !== null && parent.insertBefore(template.target, sibling);
      return template;
    } else if (parent instanceof ContainerTemplate) {
      const children: ContainerTemplateProperties['children'] = parent.children;
      const index = children.indexOf(this);
      this.destroy();
      return parent.push(TemplateOperators.createTemplate<this>(undefined, context, methods, attr, rowIndex), true, index);
    } else {
      this.destroy();
      return TemplateOperators.createTemplate<this>(parent, context, methods, attr, rowIndex);
    }
  }
  /**
   * Actualiza la propiedad ROWINDEX de acuerdo a la posición del contexto en la propiedad ROWS de la plantilla padre
   */
  public reIndex() {
    let rowIndex;
    if (this.parent instanceof ContainerTemplate) {
      rowIndex = this.parent.rows.findIndex(item => item.id === this.id);
      this.ROWINDEX = rowIndex !== -1 ? rowIndex : -2;
    } else if (this.parent instanceof Element) {
      rowIndex = Array.from((this.parent as Element).children).indexOf(this.target);
      this.ROWINDEX = rowIndex !== -1 ? rowIndex : -2;
    } else { this.ROWINDEX = 0; }
  }

  public destroy(): Promise<void> {
    return new Promise(async resolve => {
      if (!this.ISDESTROYED) {
        this.events.destroy.next();
        Object.values(this.TEMPLATEEVENTS).forEach(event => event.complete());
        if (!this.ISDESTROYED) {
          await this.closingStylesAnimation();
          if (!this.ISDESTROYED) {
            await this.destroyBehaviorInstances();
            if (!this.ISDESTROYED) {
              await this.removeChildOfParent();
              if (!this.ISDESTROYED) {
                this instanceof ContainerTemplate && await this.destroyChildren();
                if (!this.ISDESTROYED) {
                  if (this.TEMPLATECONTEXT.node?.element === this.target) {
                    this.TEMPLATECONTEXT.node.removable === true && this.target?.remove();
                  } else { this.target?.remove(); }
                  this.ROOT.remove(this);
                  TemplateOptions.remove(this);
                  Object.keys(this).forEach(key => key !== 'ISDESTROYED' ? delete this[key] : null);
                  this.ISDESTROYED = true;
                }
              }
            }
          }
        }
      }
      resolve();
    });
  }
  // PROTECTED METHODS
  protected checkObject = (element: any) => typeof element === 'object' && element === Object(element) && !Array.isArray(element);

  protected saveContext<P extends keyof T['templateContext']>(property: P, templatecontextValue: RT[P], templateDataContextValue?: RT[P]) {
    templateDataContextValue !== undefined && (this.TEMPLATEDATACONTEXT[property] = templateDataContextValue);
    this.TEMPLATECONTEXT[property] = templatecontextValue;
    if (this.parent instanceof ContainerTemplate) {
      if (this.ROWINDEX >= 0) {
        this.ROWINDEX in this.parent.rows && (this.parent.rows[this.ROWINDEX][property] = templatecontextValue);
      } else if (this.ROWINDEX === -1) {
        this.parent instanceof IterableTemplate && 'controller' in this.parent.dataContext && (this.parent.dataContext.controller[property] = templatecontextValue);
      }
    }
  }

  protected removeChildOfParent(): Promise<void> {
    return new Promise(resolve => {
      if (!this.ISDESTROYED && (this.parent instanceof ContainerTemplate) && !this.parent.isDestroyed) {
        const childIndex: number = this.parent.children.findIndex(child => child === this);
        childIndex >= 0 ? this.parent.children.splice(childIndex, 1) : null;
      }
      resolve();
    });
  }
  // PROTECTED ASYNC METHODS
  protected async setObjects(reference: object, value: object) {
    Object.entries(value).forEach(entries => {
      if (typeof reference[entries[0]] !== 'function') {
        if (this.checkObject(entries[1])) {
          this.setObjects(reference[entries[0]], entries[1]);
        } else { reference[entries[0]] = entries[1]; }
      } else { reference[entries[0]](entries[1]); }
    });
  }

  protected async destroyBehaviorInstances(): Promise<void> {
    return new Promise(resolve => {
      const behaviorInstances = Object.values(this.BEHAVIORINSTANCES);
      behaviorInstances.length === 0 && resolve();
      const behaviorProgress: boolean[] = Array.from({ length: behaviorInstances.length }, () => false);
      behaviorInstances.forEach(async (instance, idx) => {
        await instance.destroy(); behaviorProgress[idx] = true;
        if (behaviorProgress.every(progress => progress === true)) { resolve(); }
      });
    });
  }

  protected async closingStylesAnimation(): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this.ISDESTROYED && this.CLOSINGSTYLES !== undefined) {
        const endEvent = () => {
          if (this.target instanceof Element) { this.target.removeEventListener('transitionend', transitionEndend); }
          clearTimeout(maxWaitTime); resolve();
        };
        const maxWaitTime = setTimeout(() => endEvent(), this.CLOSINGSTYLES.maxWaitTime || 1001);
        const transitionEndend = (event: TransitionEvent) => {
          if (!this.ISDESTROYED && 'closeTransitionProperty' in this.CLOSINGSTYLES) {
            if (event.propertyName === this.CLOSINGSTYLES.closeTransitionProperty) { endEvent(); }
          }
        };
        this.target.addEventListener('transitionend', transitionEndend);
        this.setStyles(this.CLOSINGSTYLES, false);
      } else { resolve(); }
    });
  }
  // PRIVATE METHODS
  private setDuration(val: RT['duration']) {
    if (!this.ISDESTROYED) {
      this.saveContext('duration', val);
      const duration = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
      if (typeof duration === 'number') {
        this.DURATION = duration;
        this.TEMPLATEDATACONTEXT.duration = this.DURATION;
        if (this.parent instanceof IterableTemplate && this.parent.isDestroyed === false) {
          const parent: IterableTemplate = this.parent;
          if (this.DURATION) {
            (async () => {
              parent.templateContainer.controller && await parent.templateContainer.controller.destroy();
              parent.childrenShownChanger = { timer: window.setTimeout(() => !parent.isDestroyed ? parent.childrenShown++ : null, duration), startAt: new Date().getTime(), endAt: new Date().getTime() + duration };
              const controllerContext = (parent.templateContext && parent.templateContext.controller) || {};
              parent.templateContainer.controller = TemplateOperators.createTemplate(parent, { type: 'container', ...controllerContext }, parent.methods, parent.componentAttribute, -1);
            })();
          } else {
            clearTimeout(parent.childrenShownChanger.timer);
            const timerViewers = this.ROOT.tree.filter(branch => {
              if (branch instanceof ContainerTemplate && 'timerViewer' in branch.behaviorInstances && branch.behaviorInstances.timerViewer.options.target) {
                return parent.id === branch.behaviorInstances.timerViewer.options.target;
              } else { return false; }
            });
            timerViewers.forEach(item => clearTimeout(item.behaviorInstances.timerViewer.timerChanger.timer));
          }
        }
      }
    }
  }

  private setStyles(val: RT['styles'], save = true) {
    if (!this.ISDESTROYED) {
      save && this.saveContext('styles', { ...(this.TEMPLATECONTEXT.styles || {}), ...val });
      const styleList = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
      this.TEMPLATEDATACONTEXT.styles = { ...(this.TEMPLATEDATACONTEXT.styles || {}), ...styleList };
      const styles = Object.entries(styleList);
      styles.forEach(([key, value]) => {
        if (key in this.styles) {
          this.styles[key] = (['string', 'number'].includes(typeof value)) ? `${value}` : undefined;
        }
        if (key === 'importantStyles') {
          for (const [propertyName, propertyValue] of Object.entries(styleList.importantStyles)) {
            this.styles.setProperty(propertyName, propertyValue as string, 'important');
          }
        }
      });
    }
  }

  private setTarget(val: Partial<Element>) {
    if (!this.ISDESTROYED) {
      this.saveContext('target', { ...(this.TEMPLATECONTEXT.target || {}), ...val });
      const targetAttributes = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
      this.TEMPLATEDATACONTEXT.target = { ...(this.TEMPLATEDATACONTEXT.target || {}), ...targetAttributes };
      const attributes = Object.entries(targetAttributes);
      attributes.forEach(([key, value], index) => {
        if (key in this.target) {
          if (typeof this.target[key] !== 'function') {
            if (this.checkObject(value)) {
              this.setObjects(this.target[key], value as object);
            } else { this.target[key] = value; }
          } else { this.target.dispatchEvent(new CustomEvent(key, { detail: value })); }
        }
      });
    }
  }

}

export interface TemplateTypeList {
  template: {
    template: Template<TemplateProperties, TemplateContext>;
    properties: TemplateProperties;
    context: TemplateContext;
  };
}

// ContainerTemplate

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
  readonly templateContainer: TemplateFamily & { children: IntersectionTypeList['template'][] };
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
  destroyChildren: (children: IntersectionTypeList['template'][]) => Promise<void>;
}

export interface ContainerTemplateContext extends TemplateContext {
  rows: Partial<IntersectionTypeList['context']>[];
  type: keyof ContainerTemplateTypeList;
}

export class ContainerTemplate<P extends ContainerTemplateProperties = ContainerTemplateProperties, C extends ContainerTemplateContext = ContainerTemplateContext> extends Template<P, C> implements ContainerTemplateProperties {
  // READONLY
  /** Retorna la información almacenada en las propiedad "properties", "dataContext" y "methods" de la plantilla, de su arbol de padres y de su arbol de hijos */
  public get propertyTree(): P['propertyTree'] {
    const properties: Record<string | number, any> = super.propertyTree;
    if (this.children.length > 0) {
      properties.getChildrenTree = () => this.childrenTree.reduce((prop: Record<string, any>, child) => ({ ...prop, [child.id]: child.propertyTree }), {});
      properties.getChildren = () => this.children.map(child => child.propertyTree);
    } else { properties.getChildren = () => []; properties.getChildrenTree = () => ({}); }
    return properties;
  }

  public get children(): P['children'] { return !this.ISDESTROYED && this.TEMPLATECONTAINER ? this.TEMPLATECONTAINER.children : undefined; }

  public get childrenTree(): P['childrenTree'] {
    if (!this.ISDESTROYED) {
      const getChildren = (children: P['children']): P['children'] => {
        return children.reduce((list, child): P['children'] => {
          return [...list, child, ...('children' in child ? getChildren(child.children) : [])];
        }, []);
      };
      return getChildren(this.children);
    } else { return undefined; }
  }
  // GETTERS
  public get events(): P['events'] { return !this.ISDESTROYED ? { ...super.events, ...this.CONTAINERTEMPLATEEVENTS } : undefined; }
  protected CONTAINERTEMPLATEEVENTS: ContainerTemplateEvents = {
    childrenReady: new BehaviorSubject({ status: true, context: undefined }),
    childrenDestroyed: new Subject(),
    rowAdded: new Subject()
  };

  protected ROWS: P['rows'] = [];
  public get rows(): P['rows'] { return !this.ISDESTROYED ? this.ROWS : undefined; }
  public set rows(val: P['rows']) {
    if (!this.ISDESTROYED && Array.isArray(val)) {
      (async () => {
        const currentEvent = this.events.childrenReady.value;
        currentEvent.status === false && await new Promise<void>(resolve => this.events.childrenReady.pipe(first(event => event.status === true && event.context === currentEvent.context)).subscribe(() => resolve()));
        this.events.childrenReady.next({ status: false, context: val });
        this.saveContext('rows', val, val);
        this.ROWS = val;
        this.children.length > 0 && await this.destroyChildren(this.TEMPLATECONTAINER.children);
        const progress: boolean[] = Array.from({ length: val.length }, () => false);
        progress.length === 0 && this.events.childrenReady.next({ status: true, context: val });
        val.forEach(async (row: Partial<IntersectionTypeList['context']>, idx: number) => {
          const child = TemplateOperators.createTemplate(this, row, this.METHODS, this.COMPONENTATTRIBUTE, idx);
          child instanceof ContainerTemplate && child.rows?.length > 0 && await new Promise<void>(resolve => child.events.childrenReady.pipe(first(event => event.status === true)).subscribe(() => resolve()));
          progress[idx] = true; progress.every(status => status === true) && this.events.childrenReady.next({ status: true, context: val });
        });
      })();
    }
  }

  public get dataContext(): P['dataContext'] { return !this.ISDESTROYED ? super.dataContext : undefined; }
  public set dataContext(val: P['dataContext']) {
    if (!this.ISDESTROYED) {
      super.dataContext = val;
      this.childrenTree.forEach(child => child.events.propertyChanges.next());
    }
  }

  public get properties(): P['properties'] { return !this.ISDESTROYED ? super.properties : undefined; }
  public set properties(val: P['properties']) {
    if (!this.ISDESTROYED) {
      super.properties = val;
      this.childrenTree.forEach(child => child.events.propertyChanges.next());
    }
  }

  constructor(
    parent: P['parent'],
    templateContext: P['templateContext'],
    methods: P['methods'],
    tag: C['tag'],
    componentAttribute: P['componentAttribute'],
    rowIndex: P['rowIndex'] = 0,
    templateContainer: Partial<P['templateContainer']> = {},
    type: P['type'] = 'container'
  ) {
    super(parent, templateContext, methods, tag, componentAttribute, rowIndex, { children: [], ...templateContainer }, templateContext.type || type);
    if (templateContext.node?.element instanceof HTMLElement) {
      const rowList = [];
      Array.from(templateContext.node.element.children || []).forEach((node, idx) => {
        const attributes = Array.from(node.attributes).reduce((attr, { name, value }) => (attr[name] = value, attr), {});
        const propertyKeys = Object.keys(attributes).filter(attr => attr.match(/^template-.*/g) !== null);
        const properties: Partial<ContainerTemplateContext> = propertyKeys.reduce((ctx, key) => {
          ['name', 'type'].includes(key.slice(9)) && (ctx[key.slice(9)] = attributes[key]);
          return ctx;
        }, {});
        const context: Partial<ContainerTemplateContext> = { type: 'container', attributes, node: { element: node, removable: templateContext.node.removable }, ...properties };
        TemplateOperators.createTemplate(this, context, this.METHODS, this.COMPONENTATTRIBUTE, idx);
        rowList.push(context);
      });
      this.TEMPLATEDATACONTEXT.rows = rowList;
      this.TEMPLATECONTEXT.rows = rowList;
      this.ROWS = rowList;
    }
    if ((templateContext.type || type) === 'container') {
      const restrictions: string[] = [];
      parent instanceof IterableTemplate && restrictions.push('duration');
      this.loadTemplate(templateContext, restrictions);
      this.events.ready.next({ template: this, type: templateContext.type || type });
    }
  }

  public childrenContextTree(rowList = this.ROWS): P['rows'] {
    return !this.ISDESTROYED ? TemplateOperators.childrenContextTree(rowList) : undefined;
  }

  public loadTemplate(context: Partial<SomeContainerTemplateTypeList['context']>, restrict: string[] = []) {
    if (!this.ISDESTROYED && ![null, undefined].includes(context)) {
      super.loadTemplate(context, restrict);
    }
  }

  /**
   * Añade un elemento a la plantilla
   * @param context Elemento a añadir: Plantilla o contexto de plantilla
   * @param replace Si es verdadero se reemplazara el contenido de la propiedad ROWS en la posición especificada
   * @param index Especifica la posición de la plantilla en donde se añadirá el elemento
   * @returns Elemento añadido
   */
  public push<T extends IntersectionTypeList['template']>(context: T | T['templateContext'], replace = false, index?: number): T {
    index === undefined && (index = this.children.length - 1);
    const template: T = context instanceof Template ? context : TemplateOperators.createTemplate<T, T['templateContext']>(undefined, context, this.METHODS, this.COMPONENTATTRIBUTE, -2);
    const sibling = this.children[index - 1];
    this.ROWS.splice(index, +replace, template.templateContext);
    this.templateDataContext.rows = this.ROWS;
    this.templateContext.rows = this.ROWS;
    this.children.splice(index, 0, template);
    template.templateContainer.parent = this;
    sibling !== undefined ? sibling.target.after(template.target) : this.target.appendChild(template.target);
    this.children.forEach(child => child.reIndex());
    return template;
  }

  public appendChild = <T extends IntersectionTypeList['template']>(child: T['templateContext'], methods: ContainerTemplate['methods'] = {}): T => {
    this.ROWS[this.children.length] = child;
    return TemplateOperators.createTemplate(this, child, { ...this.METHODS, ...methods }, this.COMPONENTATTRIBUTE, this.children.length) as T;
  }

  public destroyChildren = (children?: IntersectionTypeList['template'][]): Promise<void> => new Promise<void>(resolve => {
    children === undefined && (children = this.children);
    if (!this.ISDESTROYED && children?.length > 0) {
      const progress = Array.from({ length: children.length }, () => false);
      children.forEach(async (item, index) => {
        await item.destroy(); progress[index] = true;
        if (this.ISDESTROYED === false) {
          if (progress.every(elm => elm === true)) {
            this.events.childrenDestroyed.next();
            resolve();
          }
        } else { resolve(); }
      });
    } else { resolve(); }
  })

  public destroy(): Promise<void> {
    const parentDestroy = super.destroy;
    return new Promise(async resolve => {
      if (!this.ISDESTROYED) {
        Object.values(this.CONTAINERTEMPLATEEVENTS).forEach(event => event.complete());
        if (this.parent instanceof IterableTemplate && !this.parent.isDestroyed && this.parent.templateContainer.controller === this) {
          this.parent.templateContainer.controller = undefined;
        }
        await parentDestroy.call(this);
      }
      resolve();
    });
  }

}

export interface ContainerTemplateTypeList {
  container: {
    template: ContainerTemplate<ContainerTemplateProperties, ContainerTemplateContext>;
    properties: ContainerTemplateProperties;
    context: ContainerTemplateContext;
  };
}

// IterableTemplate

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
  readonly templateContainer: ContainerTemplateProperties['templateContainer'] & { controller: IntersectionTypeList['template'] };
  readonly events: ContainerTemplateProperties['events'] & IterableTemplateEvents;
  readonly templateDataContext: Partial<IterableTemplateContext>;
  readonly templateContext: Partial<IterableTemplateContext>;
  readonly controller: IntersectionTypeList['template'];
  childrenShownChanger: { timer: number, startAt: number, endAt: number, pausedAt?: number };
  childrenLength: Exclude<IterableTemplateContext['childrenLength'], string>;
  childrenShown: Exclude<IterableTemplateContext['childrenShown'], string>;
  type: IterableTemplateContext['type'];
}

export interface IterableTemplateContext extends ContainerTemplateContext {
  controller: Partial<IntersectionTypeList['context']>;
  childrenLength: number | string;
  childrenShown: number | string;
  type: 'iterable';
}

export class IterableTemplate<P extends IterableTemplateProperties = IterableTemplateProperties, C extends IterableTemplateContext = IterableTemplateContext> extends ContainerTemplate<P, C> implements IterableTemplateProperties {
  // READONLY
  /** Retorna la información almacenada en las propiedad "properties", "dataContext" y "methods" de la plantilla, de su arbol de padres, de su arbol de hijos y el arbol del controlador */
  public get propertyTree(): P['propertyTree'] {
    const properties: Record<string | number, any> = super.propertyTree;
    properties.getController = this.controller instanceof Template ? (() => this.controller.propertyTree) : (() => undefined);
    return properties;
  }
  /** Retorna el arbol de hijos, además del arbol del controlador */
  public get childrenTree(): P['childrenTree'] {
    if (!this.ISDESTROYED) {
      const childrenTree = super.childrenTree;
      const controllerTree = childrenTree.filter(template => template instanceof IterableTemplate)
        .reduce((response: IntersectionTypeList['template'][], template: IterableTemplate) => {
          template.controller instanceof ContainerTemplate && response.push(...template.controller.childrenTree);
          template.controller instanceof Template && response.push(template.controller);
          return response;
        }, []);
      return [...childrenTree, ...controllerTree];
    } else { return undefined; }
  }
  /** Retorna la plantilla del controlador */
  public get controller(): P['controller'] { return !this.ISDESTROYED && this.TEMPLATECONTAINER ? this.TEMPLATECONTAINER.controller : undefined; }
  // GETTERS
  public get events(): P['events'] { return !this.ISDESTROYED ? { ...super.events, ...this.ITERABLETEMPLATEEVENTS } : undefined; }
  protected ITERABLETEMPLATEEVENTS: IterableTemplateEvents = { childrenShownChanges: new Subject<ChildrenShownChangesEvent>() };
  // GETTERS AND SETTERS
  public get dataContext(): P['dataContext'] { return !this.ISDESTROYED ? super.dataContext : undefined; }
  public set dataContext(val: P['dataContext']) {
    if (!this.ISDESTROYED) {
      super.dataContext = val;
      this.controller instanceof Template && !this.controller.isDestroyed && this.controller.events.propertyChanges.next();
    }
  }

  public get properties(): P['properties'] { return !this.ISDESTROYED ? super.properties : undefined; }
  public set properties(val: P['properties']) {
    if (!this.ISDESTROYED) {
      super.properties = val;
      this.controller instanceof Template && !this.controller.isDestroyed && this.controller.events.propertyChanges.next();
    }
  }

  private CHILDRENSHOWNCHANGER: P['childrenShownChanger'] = { timer: 0, startAt: 0, endAt: 0 };
  public get childrenShownChanger(): P['childrenShownChanger'] { return !this.ISDESTROYED ? this.CHILDRENSHOWNCHANGER : undefined; }
  public set childrenShownChanger(val: P['childrenShownChanger']) {
    if (!this.ISDESTROYED) {
      clearTimeout(this.CHILDRENSHOWNCHANGER.timer);
      this.CHILDRENSHOWNCHANGER = val;
    }
  }

  public get rows(): P['rows'] { return super.rows; }
  public set rows(val: P['rows']) {
    if (!this.ISDESTROYED && Array.isArray(val)) {
      (async () => {
        const currentEvent = this.events.childrenReady.value;
        currentEvent.status === false && await new Promise<void>(resolve => this.events.childrenReady.pipe(first(event => event.status === true && event.context === currentEvent.context)).subscribe(() => resolve()));
        this.events.childrenReady.next({ status: false, context: val });
        this.saveContext('rows', val, val);
        this.ROWS = val;
        await this.destroyChildren();
        this.setChildrenShown(![null, undefined].includes(this.TEMPLATECONTEXT.childrenShown) ? this.TEMPLATECONTEXT.childrenShown : this.CHILDRENSHOWN);
        this.events.childrenReady.next({ status: true, context: val });
      })();
    }
  }

  private CHILDRENLENGTH: P['childrenLength'] = 1;
  public get childrenLength(): P['childrenLength'] { return !this.ISDESTROYED ? this.CHILDRENLENGTH : undefined; }
  public set childrenLength(val: P['childrenLength']) {
    this.saveContext('childrenLength', val);
    const childrenLength = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
    this.CHILDRENLENGTH = childrenLength > 0 ? childrenLength : 1;
    this.TEMPLATEDATACONTEXT.childrenLength = this.CHILDRENLENGTH;
    this.childrenShown = this.CHILDRENSHOWN;
  }

  private CHILDRENSHOWN: P['childrenShown'] = 0;
  public get childrenShown(): P['childrenShown'] { return !this.ISDESTROYED ? this.CHILDRENSHOWN : undefined; }
  public set childrenShown(val: P['childrenShown']) { !this.ISDESTROYED && this.setChildrenShown(val); }

  constructor(
    parent: P['parent'],
    templateContext: Partial<C>,
    methods: P['methods'],
    tag?: C['tag'],
    componentAttribute?: P['componentAttribute'],
    rowIndex: P['rowIndex'] = 0,
  ) {
    super(parent, templateContext, methods, tag, componentAttribute, rowIndex, { controller: undefined } as Partial<P['templateContainer']>, 'iterable');
    const restrictions: string[] = ['childrenShown'];
    parent instanceof IterableTemplate && restrictions.push('duration');
    this.loadTemplate(templateContext, restrictions);
    this.events.ready.next({ template: this, type: 'iterable' });
  }

  /**
   * Añade un elemento a la plantilla y actualiza los elementos mostrados
   * Para que el contenido de la plantilla cambie, actualice la propiedad childrenShown
   * @param context Elemento a añadir: Plantilla o contexto de plantilla
   * @param replace Si es verdadero se reemplazara el contenido de la propiedad ROWS en la posición especificada
   * @param index Especifica la posición de la plantilla en donde se añadirá el elemento
   * @returns undefined
   */
  public push<T extends IntersectionTypeList['template']>(context: T | T['templateContext'], replace = false, index?: number): T {
    index === undefined && (index = this.children.length - 1);
    const template: T['templateContext'] = context instanceof Template ? {
      ...context.templateContext,
      node: {
        element: context.target,
        removable: 'node' in context.templateContext ? ('removable' in context.templateContext.node ? context.templateContext.node.removable : true) : true
      }
    } : context;
    this.ROWS.splice(index, +replace, template);
    this.templateDataContext.rows = this.ROWS;
    this.templateContext.rows = this.ROWS;
    this.children.forEach(child => child.reIndex());
    index >= this.properties.startAt && index < this.properties.endAt && (this.childrenShown = this.CHILDRENSHOWN);
    !('startAt' in this.properties) && (this.childrenShown = this.CHILDRENSHOWN);
    this.events.rowAdded.next(index);
    return undefined;
  }

  public childrenContextTree(rowList = this.ROWS): P['rows'] {
    if (!this.ISDESTROYED) {
      const childrenTree = super.childrenContextTree(rowList);
      const controllerTree = childrenTree.filter((context) => context.type === 'iterable')
        .reduce((response: P['rows'], context: Partial<IterableTemplateContext>) => {
          if ('controller' in context) {
            response.push(context.controller);
            'rows' in context.controller && response.push(...this.childrenContextTree(context.controller.rows));
          }
          return response;
        }, []);
      return [...childrenTree, ...controllerTree];
    } else { return undefined; }
  }

  public loadTemplate(context: Partial<IterableTemplateContext>, restrict: string[] = []) {
    if (!this.ISDESTROYED && ![null, undefined].includes(context)) {
      super.loadTemplate(context, restrict);
      type ReadOnlyProperties = 'controller' | 'parent' | 'target' | 'type';
      const properties: Array<Exclude<keyof IterableTemplateContext, ReadOnlyProperties>> = ['childrenLength'];
      properties.forEach(item => item in context && !restrict.includes(item) && (this[item] = context[item]));
    }
  }

  public destroy(): Promise<void> {
    const parentDestroy = super.destroy;
    return new Promise(async resolve => {
      if (!this.ISDESTROYED) {
        Object.values(this.ITERABLETEMPLATEEVENTS).forEach(event => event.complete());
        clearTimeout(this.CHILDRENSHOWNCHANGER.timer);
        await parentDestroy.call(this);
      }
      resolve();
    });
  }

  private setChildrenShown(index: C['childrenShown']) {
    if (!this.ISDESTROYED) {
      clearTimeout(this.childrenShownChanger.timer);
      const lastChild = this.CHILDRENSHOWN;
      this.saveContext('childrenShown', index);
      const childrenShown = +TemplateOperators.interpolateVariableIf(index, this.propertyTree);
      this.CHILDRENSHOWN = childrenShown < (this.ROWS.length / this.CHILDRENLENGTH) ? childrenShown : 0;
      this.TEMPLATEDATACONTEXT.childrenShown = this.CHILDRENSHOWN;
      (async () => {
        this.children?.length > 0 && await this.destroyChildren();
        if (!this.ISDESTROYED) {
          const startAt = !this.ISDESTROYED ? (this.CHILDRENSHOWN * this.CHILDRENLENGTH) : undefined;
          const nextChildren: Partial<IntersectionTypeList['context']>[] = !this.ISDESTROYED ? this.ROWS.slice(startAt, startAt + this.CHILDRENLENGTH) : [];
          const childrenReference = nextChildren.map((nextChild, idx) => TemplateOperators.createTemplate(this, nextChild, this.METHODS, this.COMPONENTATTRIBUTE, startAt + idx));
          const duration = nextChildren.reduce((prev: number, curr) => {
            return prev === undefined && curr.duration === undefined ? undefined :
              prev === undefined ? curr.duration : curr.duration > prev ? curr.duration : prev;
          }, undefined);
          if (duration === undefined) {
            this.templateContainer.controller = TemplateOperators.createTemplate(this, { type: 'container', ...(this.TEMPLATECONTEXT.controller || {}) }, this.METHODS, this.COMPONENTATTRIBUTE, -1);
          } else { childrenReference[0].loadTemplate({ duration }); }
          const properties: ChildrenShownChangesEvent = {
            endAt: (startAt + this.CHILDRENLENGTH) > this.ROWS.length ? this.ROWS.length : (startAt + this.CHILDRENLENGTH),
            pages: Math.ceil(this.ROWS.length / this.CHILDRENLENGTH),
            currentChildrenShownIndex: this.CHILDRENSHOWN,
            currentChildrenShown: childrenReference,
            lastChildrenShownIndex: lastChild,
            slice: this.CHILDRENLENGTH,
            length: this.ROWS.length,
            startAt
          };
          this.events.childrenShownChanges.next(properties);
          this.properties = properties;
        }
      })();
    }
  }

}

export interface ContainerTemplateTypeList {
  iterable: {
    template: IterableTemplate<IterableTemplateProperties, IterableTemplateContext>;
    properties: IterableTemplateProperties;
    context: IterableTemplateContext;
  };
}

// ElementTemplate

export interface ElementTemplateProperties extends TemplateProperties {
  readonly templateDataContext: Partial<ElementTemplateContext>;
  readonly templateContext: Partial<ElementTemplateContext>;
  type: ElementTemplateContext['type'];
  text: ElementTemplateContext['text'];
}

export interface ElementTemplateContext extends TemplateContext {
  type: 'element';
  text: string;
}

export class ElementTemplate<P extends ElementTemplateProperties = ElementTemplateProperties, C extends ElementTemplateContext = ElementTemplateContext> extends Template<P, C> implements ElementTemplateProperties {

  public get text(): P['text'] { return !this.ISDESTROYED && this.target ? this.target.innerHTML : undefined; }
  public set text(val: P['text']) {
    if (!this.ISDESTROYED && this.target) {
      this.saveContext('text', val);
      this.target.innerHTML = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
      this.TEMPLATEDATACONTEXT.text = this.target.innerHTML;
    }
  }

  constructor(
    parent: P['parent'],
    templateContext: Partial<C>,
    methods: P['methods'],
    tag?: C['tag'],
    componentAttribute?: P['componentAttribute'],
    rowIndex: P['rowIndex'] = 0,
  ) {
    super(parent, templateContext, methods, tag, componentAttribute, rowIndex, {}, 'element');
    const restrictions: string[] = [];
    parent instanceof IterableTemplate && restrictions.push('duration');
    if (templateContext.type === 'element') {
      this.loadTemplate(templateContext, restrictions);
      this.events.ready.next({ template: this, type: 'element' });
    }
  }

  destroy(): Promise<void> { return super.destroy(); }

}

export interface TemplateTypeList {
  element: {
    template: ElementTemplate<ElementTemplateProperties, ElementTemplateContext>,
    properties: ElementTemplateProperties,
    context: ElementTemplateContext,
  };
}

// Helpers

export type IntersectionTypeList = TemplateTypeList[keyof TemplateTypeList] | SomeContainerTemplateTypeList;
export type UnionTypeList = TemplateTypeList[keyof TemplateTypeList] & SomeContainerTemplateTypeList;
export type SomeContainerTemplate = ContainerTemplate<ContainerTemplateProperties, ContainerTemplateContext>;
export type SomeContainerTemplateTypeList = ContainerTemplateTypeList[keyof ContainerTemplateTypeList];
export type SomeTemplate = Template<TemplateProperties, TemplateContext>;

// IterableControllerBehavior

export interface IterableControllerBehaviorOptions {
  templateContextActive?: IntersectionTypeList['context'];
  action: 'return' | 'advance' | 'trigger';
  childrenShown?: number;
  allowReload?: boolean;
  target: string;
}

class IterableControllerBehavior {
  constructor(public template: IntersectionTypeList['template'], public options: IterableControllerBehaviorOptions) { this.init(); }

  init() {
    if ('action' in this.options) {
      const getParent = () => TemplateOperators.get(this.template.root.tree, this.options.target);
      const getPreviousElement = () => {
        const parent = getParent();
        if (parent instanceof IterableTemplate) {
          parent.childrenShown = (parent.rows[parent.childrenShown - 1] ? parent.childrenShown : parent.rows.length) - 1;
        }
      };
      const getNextElement = () => {
        const parent = getParent();
        if (parent instanceof IterableTemplate) { parent.childrenShown++; }
      };
      const getElement = () => {
        const parent = getParent();
        if (parent instanceof IterableTemplate) {
          if (this.options.childrenShown in parent.rows) {
            if (this.options.allowReload === true || this.options.childrenShown !== parent.childrenShown) {
              parent.childrenShown = this.options.childrenShown;
            }
          } else { console.warn(`index ${this.options.childrenShown} doesn't exists`); }
        }
      };
      switch (this.options.action) {
        case 'return': this.template.target.addEventListener('click', getPreviousElement); break;
        case 'advance': this.template.target.addEventListener('click', getNextElement); break;
        case 'trigger':
          let controlParent = getParent();
          if (controlParent instanceof IterableTemplate) {
            if ('childrenShown' in this.options && controlParent.childrenShown === this.options.childrenShown && 'templateContextActive' in this.options) {
              this.template.loadTemplate(this.options.templateContextActive as unknown, []);
            }
          } else {
            this.template.root.branch.pipe(first(branch => branch.id === this.options.target)).subscribe({
              next: (branch) => {
                controlParent = branch;
                if (controlParent instanceof IterableTemplate && 'childrenShown' in this.options && controlParent.childrenShown === this.options.childrenShown && 'templateContextActive' in this.options) {
                  this.template.loadTemplate(this.options.templateContextActive as unknown, []);
                }
              }
            });
          }
          this.template.target.addEventListener('click', getElement);
          break;
        default: console.warn('iterable controller action is not defined'); break;
      }
    }

  }

  destroy = (): Promise<void> => new Promise(resolve => resolve());
}

// IterableTimerControllerBehavior

export interface IterableTimerControllerBehaviorOptions {
  templateContextInactive?: IntersectionTypeList['context'];
  templateContextActive?: IntersectionTypeList['context'];
  triggerAction?: 'mouse' | 'click';
  target: string;
}

class IterableTimerControllerBehavior {
  constructor(public template: IntersectionTypeList['template'], public options: IterableTimerControllerBehaviorOptions) { this.init(); }

  init() {
    const parent = TemplateOperators.get(this.template.root.tree, this.options.target);
    if (parent instanceof IterableTemplate) {
      if ('templateContextActive' in this.options) {
        this.template.loadTemplate(this.options.templateContextActive as unknown, []);
      }
      const toggleDuration = (status?: boolean) => {
        if (!this.template.isDestroyed) {
          if ((status === undefined || status === true) && parent.childrenShownChanger.pausedAt) {
            const pausedTime = parent.childrenShownChanger.endAt - parent.childrenShownChanger.pausedAt;
            delete parent.childrenShownChanger.pausedAt;
            parent.childrenShownChanger = {
              timer: window.setTimeout(() => !parent.isDestroyed ? parent.childrenShown++ : null, pausedTime),
              startAt: new Date().getTime(), endAt: new Date().getTime() + pausedTime
            };
            TemplateOperators.getControllers(this.template.root.tree, parent, 'timerViewer').forEach(item => {
              const reference = item.behaviorInstances.timerViewer;
              const showDuration = () => {
                if (!item.isDestroyed) {
                  const remaining = parent.childrenShownChanger.endAt - new Date().getTime();
                  item.target.classList.add('before-active-content', 'after-active-content');
                  item.target.innerHTML = ((): string => {
                    switch (typeof reference.options.formatter) {
                      case 'string': return reference.options.formatter in reference.template.methods ? reference.template.methods[reference.options.formatter](remaining, false) : `${remaining}`;
                      case 'function': return reference.options.formatter(remaining, false);
                      default: return `${remaining}`;
                    }
                  })();
                  if (remaining > 0) {
                    reference.timerChanger = {
                      timer: window.setTimeout(showDuration, remaining >= 1000 ? 1000 : remaining),
                      endAt: new Date().getTime() + (remaining >= 1000 ? 1000 : remaining),
                      startAt: new Date().getTime(),
                    };
                  } else { parent.childrenShownChanger.endAt = 0; }
                }
              };
              reference.timerChanger = {
                timer: window.setTimeout(showDuration, pausedTime % 1000),
                endAt: new Date().getTime() + (pausedTime % 1000),
                startAt: new Date().getTime(),
              };
            });
            TemplateOperators.getControllers(this.template.root.tree, parent, 'timerController').forEach(item => {
              if ('options' in item.behaviorInstances.timerController && 'templateContextActive' in item.behaviorInstances.timerController.options) {
                item.loadTemplate(item.behaviorInstances.timerController.options.templateContextActive as unknown, []);
              }
            });
          } else {
            clearTimeout(parent.childrenShownChanger.timer);
            TemplateOperators.getControllers(this.template.root.tree, parent, 'timerViewer').forEach(item => clearTimeout(item.behaviorInstances.timerViewer.timerChanger.timer));
            parent.childrenShownChanger.pausedAt = new Date().getTime();
            TemplateOperators.getControllers(this.template.root.tree, parent, 'timerController').forEach(item => {
              if ('options' in item.behaviorInstances.timerController && 'templateContextInactive' in item.behaviorInstances.timerController.options) {
                item.loadTemplate(item.behaviorInstances.timerController.options.templateContextInactive as unknown, []);
              }
            });
          }
        }
      };
      switch (this.options.triggerAction) {
        case 'mouse':
          this.template.target.addEventListener('mouseenter', () => toggleDuration(false));
          this.template.target.addEventListener('mouseleave', () => toggleDuration(true));
          break;
        default:
          this.template.target.addEventListener('click', () => toggleDuration());
          break;
      }
    } else {
      const branchInstance = this.template.root.branch.subscribe({
        next: branch => { if (branch.id === this.options.target) { branchInstance.unsubscribe(); this.init(); } }
      });
    }
  }

  destroy = (): Promise<void> => new Promise(resolve => resolve());
}

// IterableTimerViewerBehavior

export interface IterableTimerViewerBehaviorOptions {
  formatter?: string | ((date: number, useSeconds: boolean) => string);
  target: string;
}

class IterableTimerViewerBehavior {

  private TIMERCHANGER: { timer: number, startAt: number, endAt: number } = { timer: 0, startAt: 0, endAt: 0 };
  public get timerChanger(): { timer: number, startAt: number, endAt: number } { return this.TIMERCHANGER; }
  public set timerChanger(val: { timer: number, startAt: number, endAt: number }) {
    clearTimeout(this.TIMERCHANGER.timer);
    this.TIMERCHANGER = val;
  }

  constructor(public template: IntersectionTypeList['template'], public options: IterableTimerViewerBehaviorOptions) { this.init(); }

  init() {
    const parent = TemplateOperators.get(this.template.root.tree, this.options.target);
    if (parent instanceof IterableTemplate) {
      if (parent.childrenShownChanger.endAt > 0) {
        const showDuration = () => {
          if (!this.template.isDestroyed) {
            const remaining = parent.childrenShownChanger.endAt - new Date().getTime();
            this.template.target.classList.add('before-active-content', 'after-active-content');
            this.template.target.innerHTML = ((): string => {
              switch (typeof this.options.formatter) {
                case 'string': return this.options.formatter in this.template.methods ? this.template.methods[this.options.formatter](remaining, false) : `${remaining}`;
                case 'function': return this.options.formatter(remaining, false);
                default: return `${remaining}`;
              }
            })();
            if (remaining > 0) {
              this.TIMERCHANGER = {
                timer: window.setTimeout(showDuration, remaining >= 1000 ? 1000 : remaining),
                endAt: new Date().getTime() + (remaining >= 1000 ? 1000 : remaining),
                startAt: new Date().getTime(),
              };
            } else { parent.childrenShownChanger.endAt = 0; }
          }
        };
        this.TIMERCHANGER = {
          timer: window.setTimeout(showDuration, 1000),
          endAt: new Date().getTime() + 1000,
          startAt: new Date().getTime(),
        };
      }
    } else {
      const branchInstance = this.template.root.branch.subscribe(branch => {
        if (branch.id === this.options.target) { branchInstance.unsubscribe(); this.init(); }
      });
    }
  }

  destroy = (): Promise<void> => new Promise(resolve => (clearTimeout(this.TIMERCHANGER.timer), resolve()));
}

// IterableListPreviewBehavior

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

class IterableListPreviewBehavior {

  private childrenList: IntersectionTypeList['template'][] = [];
  private isDestroyed = false;

  constructor(public template: IntersectionTypeList['template'], public options: IterableListPreviewBehaviorOptions) { this.init(); }

  init() {
    const parent = TemplateOperators.get(this.template.root.tree, this.options.target);
    if (parent instanceof IterableTemplate && !this.isDestroyed) {
      if (this.template instanceof ContainerTemplate && !this.isDestroyed) {
        const templateContextInactive = 'templateContextInactive' in this.options ? this.options.templateContextInactive : {};
        const templateContextActive = this.options.templateContextActive;
        const templateContext = this.options.templateContext;
        const template: ContainerTemplate = this.template;
        if (templateContextActive !== undefined) {
          parent.events.childrenShownChanges.subscribe({
            next: element => {
              if (!template.isDestroyed && template.children.length > 0) {
                template.children[element.currentChildrenShownIndex].loadTemplate(templateContextActive as unknown, []);
                element.currentChildrenShownIndex !== element.lastChildrenShownIndex && template.children[element.lastChildrenShownIndex].loadTemplate(templateContextInactive as unknown, []);
              }
            }
          });
        }
        const appenChild = (item, i: number) => {
          if (!this.isDestroyed) {
            const context: Partial<TemplateContext> = { ...templateContext, ...(i === parent.childrenShown ? (templateContextActive || templateContextInactive) : templateContextInactive) };
            if ('changeIterableElement' in template.methods) { console.warn('method "changeIterableElement" has been used, rename this'); }
            const child = template.appendChild({ ...context, addEvents: [['click', { name: 'changeIterableElement' }]] }, {
              changeIterableElement: (event: Event & TemplateEvent) => {
                const index: number = (event.templateEvent.target.parent as SomeContainerTemplate).children.indexOf(event.templateEvent.target);
                index >= 0 ? parent.childrenShown = index : null;
              }
            });
            this.childrenList.push(child);
            child.properties = { rowReference: item, indexReference: i };
          }
        };
        parent.events.rowAdded.subscribe({ next: index => appenChild(parent.rows[index], index) });
        parent.events.childrenReady.subscribe({
          next: async ev => {
            if (ev.status === true) {
              template.children.length > 0 && await template.destroyChildren();
              parent.rows.forEach((item, i: number) => appenChild(item, i));
            }
          }
        });
      }
    } else { !this.isDestroyed && this.template.root.branch.pipe(first(branch => branch.id === this.options.target)).subscribe(() => this.init()); }
  }

  destroy = (): Promise<void> => new Promise(async resolve => {
    this.isDestroyed = true;
    const deleteFn = async (index: number) => {
      if (index in this.childrenList) {
        await this.childrenList[index].destroy();
        this.childrenList.splice(index, 1);
        deleteFn(index);
      }
    };
    await deleteFn(0);
    resolve();
  })

}

// IterableViewer

export interface IterableViewerBehaviorOptions { target: string; }

class IterableViewerBehavior {

  constructor(public template: IntersectionTypeList['template'], public options: IterableViewerBehaviorOptions) { this.init(); }

  init() {
    const parent = TemplateOperators.get(this.template.root.tree, this.options.target);
    this.template.properties = {
      currentChildrenShownIndex: undefined,
      lastChildrenShownIndex: undefined,
      currentChildrenShown: undefined,
      length: 0, slice: 0, pages: 0,
      startAt: 0, endAt: 0
    };
    if (parent instanceof IterableTemplate) { parent.events.childrenShownChanges.subscribe(event => this.template.properties = event); }
  }

  destroy = (): Promise<void> => new Promise(async resolve => resolve());

}

// BehaviorOptions

BehaviorOptions.use('timerController', IterableTimerControllerBehavior);
BehaviorOptions.use('iterableController', IterableControllerBehavior);
BehaviorOptions.use('timerViewer', IterableTimerViewerBehavior);
BehaviorOptions.use('listPreview', IterableListPreviewBehavior);
BehaviorOptions.use('iterableViewer', IterableViewerBehavior);

// tslint:disable-next-line: no-namespace
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
