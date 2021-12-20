var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BehaviorSubject, Subject } from 'rxjs';
import { first } from 'rxjs/operators';
class Behavior {
    constructor() {
        this.BEHAVIORLIST = {};
    }
    get behaviorList() { return this.BEHAVIORLIST; }
    use(name, behavior) {
        name in this.BEHAVIORLIST ? (console.warn(`behavior (${name}) already exists`)) : this.BEHAVIORLIST[name] = behavior;
    }
}
export const BehaviorOptions = new Behavior();
// TemplateOperators
export class TemplateOperators {
    static childrenContextTree(rowList) {
        return rowList.reduce((list, child) => {
            return [...list, child, ...('rows' in child ? TemplateOperators.childrenContextTree(child.rows) : [])];
        }, []);
    }
    static copyOf(reference, excludedProperties = []) {
        return Object.keys(reference).reduce((copy, key) => {
            if (!excludedProperties.includes(key)) {
                copy[key] = typeof reference[key] === 'object' && reference[key] !== null ? this.copyOf(reference[key], excludedProperties) : reference[key];
            }
            return copy;
        }, Array.isArray(reference) ? [] : {});
    }
    static checkIfUseSpecificProperties(context, prop) {
        if (typeof context === 'object' && context !== null) {
            return Object.keys(context).some(key => this.checkIfUseSpecificProperties(context[key], prop));
        }
        else if (typeof context === 'string') {
            const matches = context.match(prop !== undefined ? new RegExp(`{{.*${prop}.*}}`, 'g') : /{{.*?}}/g);
            return matches !== null;
        }
    }
    static checkIfUseProperties(context) {
        if (typeof context === 'object' && context !== null) {
            return Object.keys(context).some(key => this.checkIfUseProperties(context[key]));
        }
        else if (typeof context === 'string') {
            const matches = context.match(/{{.*?}}/g);
            return matches !== null;
        }
    }
    static interpolateVariables(reference, context, key) {
        if (typeof context === 'object' && context !== null) {
            if (typeof context[key] === 'object' && context[key] !== null) {
                Object.keys(context[key]).forEach(k => this.interpolateVariables(reference, context[key], k));
            }
            else if (typeof context[key] === 'string') {
                const matches = context[key].match(/{{.*?}}/g);
                matches !== null && matches.map(res => res.replace(/{{|}}/g, '')).forEach(item => {
                    let result;
                    try {
                        // tslint:disable: no-eval
                        const variableBlackList = ['TemplateTree', 'TemplateOptions', 'Template', 'ContainerTemplate', 'IterableTemplate', 'ElementTemplate', 'IterableControllerBehavior', 'IterableTimerControllerBehavior', 'IterableTimerViewerBehavior', 'IterableListPreviewBehavior', 'TemplateOperators', 'BehaviorOptions', 'Behavior', 'reference', 'context', 'key', 'matches', 'result', 'variableList', 'item', 'variableBlackList'];
                        let variableList = '';
                        Object.keys(reference).forEach(k => {
                            if (!variableBlackList.includes(k)) {
                                variableList = `${variableList} const ${k} = reference["${k}"];`;
                                variableBlackList.push(k);
                            }
                            else {
                                console.warn(`variable declaration ${k} is not available`);
                            }
                        });
                        result = eval(`(function () { ${variableList} return ${item} })();`);
                        // tslint:enable: no-eval
                    }
                    catch (error) {
                        result = new Error(error).message;
                    }
                    context[key] = context[key].replace(`{{${item}}}`, result);
                });
            }
        }
    }
    static interpolateVariableIf(key, propertyList) {
        const context = this.copyOf({ key });
        this.checkIfUseProperties(context.key) && TemplateOperators.interpolateVariables(propertyList, context, 'key');
        return context.key;
    }
    static templateSelector(tree, selector) {
        return tree.find(branch => {
            return Object.entries(selector).every(([key, value]) => key in branch ? this.checkObject(branch[key], value) : false);
        });
    }
    static templateSelectorAll(tree, selector) {
        return tree.filter((branch) => {
            return Object.entries(selector).every(([key, value]) => key in branch ? this.checkObject(branch[key], value) : false);
        });
    }
    static getContext(context, selector) {
        const contextList = this.getRows(context);
        return contextList.find(item => {
            return Object.entries(selector).every(([key, value]) => key in item ? this.checkObject(item[key], value) : false);
        });
    }
    static get(tree, branch) {
        return tree.find(item => (branch instanceof Template ? item : item.id) === branch);
    }
    static getControllers(tree, iterable, behavior) {
        const root = iterable instanceof IterableTemplate ? iterable : this.get(tree, iterable);
        return tree.filter(branch => behavior in branch.behaviorInstances && branch.behaviorInstances[behavior].options.target === root.id);
    }
    static createTemplate(parent, templateContext, methods, componentAttribute, rowIndex = 0) {
        switch (templateContext.type) {
            case 'container':
                return new ContainerTemplate(parent, templateContext, methods, templateContext ? templateContext.tag : undefined, componentAttribute, rowIndex, {}, 'container');
            case 'iterable':
                return new IterableTemplate(parent, templateContext, methods, templateContext.tag, componentAttribute, rowIndex);
            case 'element':
                return new ElementTemplate(parent, templateContext, methods, templateContext.tag, componentAttribute, rowIndex);
            default:
                return new Template(parent, templateContext, methods, templateContext ? templateContext.tag : undefined, componentAttribute, rowIndex, {}, 'template');
        }
    }
    static getRows(children) {
        return children.reduce((pre, child) => {
            return [...pre, child, ...('rows' in child ? this.getRows(child.rows) : [])];
        }, []);
    }
    static checkObject(key, value) {
        if (key !== undefined && typeof value === 'object' && value !== null) {
            return Object.entries(value).every(([k, v]) => k in key ? this.checkObject(key[k], v) : false);
        }
        else {
            return key === value;
        }
    }
}
// TemplateTree
class TemplateTree {
    constructor() {
        this.TREE = [];
        this.BRANCH = new Subject();
    }
    get tree() { return this.TREE; }
    get branch() { return this.BRANCH; }
    add(branch) {
        branch.events.ready.pipe(first((ref) => ref.template instanceof Template)).subscribe({ next: () => this.BRANCH.next(branch) });
        return this.TREE.push(branch);
    }
    remove(branch) {
        const rootIndex = this.TREE.indexOf(branch);
        rootIndex >= 0 ? this.TREE.splice(rootIndex, 1) : null;
    }
}
export const TemplateOptions = new TemplateTree();
export class Template {
    // CONSTRUCTOR
    constructor(parent, templateContext, methods, tag, componentAttribute, rowIndex = 0, templateContainer = {}, type = 'template') {
        this.ISDESTROYED = false;
        this.TEMPLATECONTAINER = undefined;
        this.METHODS = {};
        this.TEMPLATECONTEXT = {};
        this.TEMPLATEDATACONTEXT = {};
        this.TYPE = undefined;
        this.BEHAVIORINSTANCES = {};
        this.TEMPLATEEVENTS = {
            ready: new BehaviorSubject({ template: undefined, type: undefined }),
            propertyChanges: new Subject(),
            DOMChanged: new Subject(),
            destroy: new Subject()
        };
        // GETTERS AND SETTERS
        this.DATACONTEXT = {};
        this.PROPERTIES = {};
        this.DURATION = null;
        // PROTECTED METHODS
        this.checkObject = (element) => typeof element === 'object' && element === Object(element) && !Array.isArray(element);
        this.TEMPLATECONTAINER = Object.assign({ parent: undefined, target: undefined }, templateContainer);
        this.TYPE = templateContext.type || type;
        this.ROWINDEX = rowIndex;
        Object.entries(templateContext).filter(([name]) => !['addEvents', 'callback', 'behavior'].includes(name)).forEach(([key, value]) => this.saveContext(key, value));
        'type' in templateContext ? this.saveContext('type', templateContext.type, templateContext.type) : this.saveContext('type', type, type);
        'node' in templateContext && this.saveContext('node', templateContext.node, templateContext.node);
        'tag' in templateContext && this.saveContext('tag', templateContext.tag, templateContext.tag);
        const templateId = `node-${TemplateOptions.add(this)}`;
        this.TEMPLATECONTAINER.target = (templateContext.node && templateContext.node.element) || document.createElement(tag || 'div');
        this.TEMPLATECONTAINER.target.id = this.TEMPLATECONTAINER.target.getAttribute('id') || templateContext.id || templateId;
        this.TEMPLATECONTAINER.parent = parent;
        this.saveContext('id', this.TEMPLATECONTAINER.target.id, this.TEMPLATECONTAINER.target.id);
        if (parent instanceof ContainerTemplate) {
            !Array.from(parent.target.children).includes(this.target) && parent.target.appendChild(this.TEMPLATECONTAINER.target);
            !componentAttribute ? componentAttribute = parent.componentAttribute : null;
            methods = !methods ? parent.methods : Object.assign({}, parent.methods, methods);
            parent.children.push(this);
        }
        else if (parent instanceof Element) {
            parent.appendChild(this.TEMPLATECONTAINER.target);
        }
        this.COMPONENTATTRIBUTE = componentAttribute;
        this.METHODS = methods;
        componentAttribute instanceof Attr ? (this.TEMPLATECONTAINER.target.setAttribute(componentAttribute.name, componentAttribute.value)) : null;
        this.ROOT = parent instanceof Template ? parent.root : new TemplateTree();
        this.ROOT.add(this);
        this.target.addEventListener('getTemplate', (ev) => {
            if ('callback' in ev.detail && typeof ev.detail.callback === 'function') {
                ev.detail.callback(this, ev.detail.params);
            }
        });
        if (this.parent instanceof Element) {
            this.parent.addEventListener('getTemplate', (ev) => {
                if ('callback' in ev.detail && typeof ev.detail.callback === 'function') {
                    ev.detail.callback(this.ROOT, ev.detail.params);
                }
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
            for (const mutation of mutationsList) {
                mutation.type === 'childList' && this.events.DOMChanged.next({ template: this, type: 'childList', event: mutation });
            }
        });
        this.events.destroy.subscribe(() => observer.disconnect());
        observer.observe(this.target, { attributes: false, childList: true, subtree: false });
    }
    // READONLY
    /** Retorna la información almacenada en las propiedades "properties", "dataContext" y "methods" de la plantilla */
    get propertyList() { return Object.assign({ templateRef: this }, this.properties, this.dataContext, { methods: this.METHODS }); }
    /** Retorna la información almacenada en las propiedad "properties", "dataContext" y "methods" de la plantilla y de su arbol de padres */
    get propertyTree() {
        const properties = this.propertyList;
        if (this.parent instanceof ContainerTemplate) {
            properties.getParentTree = () => this.parentTree.reduce((prop, parent) => (Object.assign({}, prop, { [parent.id]: parent.propertyTree })), {});
            properties.getParent = () => this.parent.propertyTree;
        }
        else {
            properties.getParentTree = () => ({});
            properties.getParent = () => undefined;
        }
        return properties;
    }
    get parentTree() {
        if (!this.ISDESTROYED) {
            const getParent = (parent, list) => {
                return parent instanceof ContainerTemplate ? getParent(parent.parent, [...list, parent]) : list;
            };
            return getParent(this.parent, []);
        }
        else {
            return undefined;
        }
    }
    get parent() { return !this.ISDESTROYED && this.TEMPLATECONTAINER ? this.TEMPLATECONTAINER.parent : undefined; }
    get target() { return !this.ISDESTROYED && this.TEMPLATECONTAINER ? this.TEMPLATECONTAINER.target : undefined; }
    // GETTERS
    get rowIndex() { return this.ROWINDEX; }
    get root() { return !this.ISDESTROYED ? this.ROOT : undefined; }
    get isDestroyed() { return this.ISDESTROYED; }
    get templateContainer() { return !this.ISDESTROYED ? this.TEMPLATECONTAINER : undefined; }
    get componentAttribute() { return !this.ISDESTROYED ? this.COMPONENTATTRIBUTE : undefined; }
    get methods() { return !this.ISDESTROYED ? this.METHODS : undefined; }
    get templateContext() { return !this.ISDESTROYED ? this.TEMPLATECONTEXT : undefined; }
    get templateDataContext() { return !this.ISDESTROYED ? this.TEMPLATEDATACONTEXT : undefined; }
    get type() { return !this.ISDESTROYED ? this.TYPE : undefined; }
    get behaviorInstances() { return this.BEHAVIORINSTANCES; }
    get events() { return !this.ISDESTROYED ? this.TEMPLATEEVENTS : undefined; }
    // SETTERS
    set addClasses(val) {
        if (!this.ISDESTROYED && this.target) {
            this.saveContext('addClasses', val);
            const classList = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
            this.TEMPLATEDATACONTEXT.addClasses = classList;
            this.target.classList.add(...classList.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ').split(' '));
        }
    }
    set classes(val) {
        if (!this.ISDESTROYED && this.target) {
            this.saveContext('classes', val);
            const classList = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
            this.TEMPLATEDATACONTEXT.classes = classList;
            this.target.setAttribute('class', classList.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' '));
        }
    }
    set attributes(val) {
        if (!this.ISDESTROYED && this.target) {
            const attributes = Object.assign({}, (this.TEMPLATECONTEXT.attributes || {}), val);
            this.saveContext('attributes', attributes);
            const attributeList = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
            this.TEMPLATEDATACONTEXT.attributes = Object.assign({}, (this.TEMPLATEDATACONTEXT.attributes || {}), attributeList);
            Object.entries(attributeList).forEach(item => this.target.setAttribute(item[0], item[1]));
        }
    }
    set callback(val) {
        if (!this.ISDESTROYED) {
            this.saveContext('callback', val);
            const callbacks = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
            this.TEMPLATEDATACONTEXT.callback = callbacks;
            const getPromise = (index) => {
                if (index in callbacks) {
                    const options = callbacks[index];
                    if (options.name) {
                        if (options.name in this.METHODS) {
                            this.METHODS[options.name](this, options).then(response => {
                                this.checkObject(response) ? (this.loadTemplate(response, [])) : null;
                            }).finally(() => getPromise(++index));
                        }
                        else {
                            console.warn(`method ${options.name} does not exist`);
                        }
                    }
                    else if (options.method && options.method in this.METHODS) {
                        this.METHODS[options.method](options.source).subscribe(response => {
                            this.loadTemplate({ [options.property]: response }, []);
                            getPromise(++index);
                        });
                    }
                    else {
                        console.warn('"method.name" must be defined');
                        getPromise(++index);
                    }
                }
            };
            getPromise(0);
        }
    }
    // PROTECTED SETTERS
    set behavior(val) {
        if (!this.ISDESTROYED && val !== undefined) {
            this.saveContext('behavior', val, val);
            Object.entries(val).forEach(([behavior, options], idx) => {
                if (behavior in BehaviorOptions.behaviorList) {
                    (() => __awaiter(this, void 0, void 0, function* () {
                        behavior in this.BEHAVIORINSTANCES && (yield this.BEHAVIORINSTANCES[behavior].destroy());
                        this.BEHAVIORINSTANCES[behavior] = new BehaviorOptions.behaviorList[behavior](this, options || {});
                    }))();
                }
                else {
                    console.warn(`behavior (${behavior}) is not defined`);
                }
            });
        }
    }
    get dataContext() { return this.ISDESTROYED === false ? this.DATACONTEXT : undefined; }
    set dataContext(val) {
        if (!this.ISDESTROYED) {
            this.DATACONTEXT = Object.assign({}, this.DATACONTEXT, val);
            this.saveContext('dataContext', this.DATACONTEXT, this.DATACONTEXT);
            this.events.propertyChanges.next();
        }
    }
    get properties() { return this.ISDESTROYED === false ? this.PROPERTIES : undefined; }
    set properties(val) {
        if (!this.ISDESTROYED) {
            this.PROPERTIES = Object.assign({}, this.PROPERTIES, val);
            this.events.propertyChanges.next();
        }
    }
    get name() { return !this.ISDESTROYED ? this.NAME : undefined; }
    set name(val) {
        if (!this.ISDESTROYED) {
            this.saveContext('name', val);
            this.NAME = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
            this.TEMPLATEDATACONTEXT.name = this.NAME;
        }
    }
    get closingStyles() { return !this.ISDESTROYED ? this.CLOSINGSTYLES : undefined; }
    set closingStyles(val) {
        if (!this.ISDESTROYED) {
            this.saveContext('closingStyles', val);
            this.CLOSINGSTYLES = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
            this.TEMPLATEDATACONTEXT.closingStyles = this.CLOSINGSTYLES;
        }
    }
    get duration() { return !this.ISDESTROYED ? this.DURATION : undefined; }
    set duration(val) { !this.ISDESTROYED && this.setDuration(val); }
    // GETTERS AND SETTERS LINK
    get id() { return !this.ISDESTROYED && this.target ? this.target.id : undefined; }
    set id(val) {
        if (!this.ISDESTROYED && this.target) {
            this.saveContext('id', val);
            this.target.id = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
            this.TEMPLATEDATACONTEXT.id = this.target.id;
        }
    }
    set styles(val) { !this.ISDESTROYED && this.setStyles(val); }
    get styles() { return !this.ISDESTROYED && this.target ? (this.target instanceof HTMLElement ? this.target.style : {}) : undefined; }
    // PUBLIC METHODS
    /**
     * Añade métodos al listado
     * @param methodName Nombre del método
     * @param methodFn Callback
     */
    addMethods(methodName, methodFn) {
        this.METHODS[methodName] = methodFn;
    }
    addEvents(events) {
        if (!this.ISDESTROYED) {
            const addEvents = [...(this.TEMPLATECONTEXT.addEvents || []), ...events];
            this.saveContext('addEvents', addEvents, addEvents);
            events.forEach(params => {
                if (this.target && params.length > 1) {
                    const options = params[1];
                    if (options.name) {
                        if (options.name in this.METHODS) {
                            this.target.addEventListener(params[0], event => !this.ISDESTROYED && this.METHODS[options.name](Object.assign(event, { templateEvent: { target: this, options } })));
                        }
                        else {
                            console.warn(`method ${options.name} does not exist`);
                        }
                    }
                    else {
                        console.warn('"method.name" must be defined');
                    }
                }
            });
        }
    }
    loadTemplate(context, restrict = []) {
        if (!this.ISDESTROYED && ![null, undefined].includes(context)) {
            if ('name' in context) {
                this.name = context.name;
            }
            if ('dataContext' in context) {
                this.dataContext = context.dataContext;
            }
            if ('parent' in context && this.parent instanceof ContainerTemplate) {
                this.saveContext('parent', context.parent, context.parent);
                this.parent.loadTemplate(context.parent, ['rows', 'childrenShown', 'callback']);
            }
            if ('closingStyles' in context) {
                this.closingStyles = context.closingStyles;
            }
            if ('styles' in context && this.target) {
                this.setStyles(context.styles);
            }
            if ('classes' in context && this.target) {
                this.classes = context.classes;
            }
            if ('addClasses' in context && this.target) {
                this.addClasses = context.addClasses;
            }
            if ('attributes' in context && this.target) {
                this.attributes = context.attributes;
            }
            if ('id' in context && (!restrict.includes('id')) && this.target) {
                this.id = context.id;
            }
            if ('target' in context && this.target) {
                this.setTarget(context.target);
            }
            if ('duration' in context && (!restrict.includes('duration'))) {
                this.setDuration(context.duration);
            }
            if ('callback' in context && (!restrict.includes('callback'))) {
                this.callback = context.callback;
            }
            if ('addEvents' in context) {
                this.addEvents(context.addEvents);
            }
            if ('behavior' in context) {
                this.behavior = context.behavior;
            }
        }
    }
    reload() {
        const [context, methods, attr, rowIndex] = [this.TEMPLATECONTEXT, this.METHODS, this.COMPONENTATTRIBUTE, this.ROWINDEX];
        const parent = this.parent;
        if (parent instanceof HTMLElement) {
            const sibling = this.target.nextElementSibling;
            this.destroy();
            const template = TemplateOperators.createTemplate(parent, context, methods, attr, rowIndex);
            sibling !== null && parent.insertBefore(template.target, sibling);
            return template;
        }
        else if (parent instanceof ContainerTemplate) {
            const children = parent.children;
            const index = children.indexOf(this);
            this.destroy();
            return parent.push(TemplateOperators.createTemplate(undefined, context, methods, attr, rowIndex), true, index);
        }
        else {
            this.destroy();
            return TemplateOperators.createTemplate(parent, context, methods, attr, rowIndex);
        }
    }
    /**
     * Actualiza la propiedad ROWINDEX de acuerdo a la posición del contexto en la propiedad ROWS de la plantilla padre
     */
    reIndex() {
        let rowIndex;
        if (this.parent instanceof ContainerTemplate) {
            rowIndex = this.parent.rows.findIndex(item => item.id === this.id);
            this.ROWINDEX = rowIndex !== -1 ? rowIndex : -2;
        }
        else if (this.parent instanceof Element) {
            rowIndex = Array.from(this.parent.children).indexOf(this.target);
            this.ROWINDEX = rowIndex !== -1 ? rowIndex : -2;
        }
        else {
            this.ROWINDEX = 0;
        }
    }
    destroy() {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            if (!this.ISDESTROYED) {
                this.events.destroy.next();
                Object.values(this.TEMPLATEEVENTS).forEach(event => event.complete());
                if (!this.ISDESTROYED) {
                    yield this.closingStylesAnimation();
                    if (!this.ISDESTROYED) {
                        yield this.destroyBehaviorInstances();
                        if (!this.ISDESTROYED) {
                            yield this.removeChildOfParent();
                            if (!this.ISDESTROYED) {
                                this instanceof ContainerTemplate && (yield this.destroyChildren());
                                if (!this.ISDESTROYED) {
                                    if (this.TEMPLATECONTEXT.node && this.TEMPLATECONTEXT.node.element === this.target) {
                                        this.TEMPLATECONTEXT.node.removable === true && this.target && this.target.remove();
                                    }
                                    else {
                                        this.target && this.target.remove();
                                    }
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
        }));
    }
    saveContext(property, templatecontextValue, templateDataContextValue) {
        templateDataContextValue !== undefined && (this.TEMPLATEDATACONTEXT[property] = templateDataContextValue);
        this.TEMPLATECONTEXT[property] = templatecontextValue;
        if (this.parent instanceof ContainerTemplate) {
            if (this.ROWINDEX >= 0) {
                this.ROWINDEX in this.parent.rows && (this.parent.rows[this.ROWINDEX][property] = templatecontextValue);
            }
            else if (this.ROWINDEX === -1) {
                this.parent instanceof IterableTemplate && 'controller' in this.parent.dataContext && (this.parent.dataContext.controller[property] = templatecontextValue);
            }
        }
    }
    removeChildOfParent() {
        return new Promise(resolve => {
            if (!this.ISDESTROYED && (this.parent instanceof ContainerTemplate) && !this.parent.isDestroyed) {
                const childIndex = this.parent.children.findIndex(child => child === this);
                childIndex >= 0 ? this.parent.children.splice(childIndex, 1) : null;
            }
            resolve();
        });
    }
    // PROTECTED ASYNC METHODS
    setObjects(reference, value) {
        return __awaiter(this, void 0, void 0, function* () {
            Object.entries(value).forEach(entries => {
                if (typeof reference[entries[0]] !== 'function') {
                    if (this.checkObject(entries[1])) {
                        this.setObjects(reference[entries[0]], entries[1]);
                    }
                    else {
                        reference[entries[0]] = entries[1];
                    }
                }
                else {
                    reference[entries[0]](entries[1]);
                }
            });
        });
    }
    destroyBehaviorInstances() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                const behaviorInstances = Object.values(this.BEHAVIORINSTANCES);
                behaviorInstances.length === 0 && resolve();
                const behaviorProgress = Array.from({ length: behaviorInstances.length }, () => false);
                behaviorInstances.forEach((instance, idx) => __awaiter(this, void 0, void 0, function* () {
                    yield instance.destroy();
                    behaviorProgress[idx] = true;
                    if (behaviorProgress.every(progress => progress === true)) {
                        resolve();
                    }
                }));
            });
        });
    }
    closingStylesAnimation() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                if (!this.ISDESTROYED && this.CLOSINGSTYLES !== undefined) {
                    const endEvent = () => {
                        if (this.target instanceof Element) {
                            this.target.removeEventListener('transitionend', transitionEndend);
                        }
                        clearTimeout(maxWaitTime);
                        resolve();
                    };
                    const maxWaitTime = setTimeout(() => endEvent(), this.CLOSINGSTYLES.maxWaitTime || 1001);
                    const transitionEndend = (event) => {
                        if (!this.ISDESTROYED && 'closeTransitionProperty' in this.CLOSINGSTYLES) {
                            if (event.propertyName === this.CLOSINGSTYLES.closeTransitionProperty) {
                                endEvent();
                            }
                        }
                    };
                    this.target.addEventListener('transitionend', transitionEndend);
                    this.setStyles(this.CLOSINGSTYLES, false);
                }
                else {
                    resolve();
                }
            });
        });
    }
    // PRIVATE METHODS
    setDuration(val) {
        if (!this.ISDESTROYED) {
            this.saveContext('duration', val);
            const duration = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
            if (typeof duration === 'number') {
                this.DURATION = duration;
                this.TEMPLATEDATACONTEXT.duration = this.DURATION;
                if (this.parent instanceof IterableTemplate && this.parent.isDestroyed === false) {
                    const parent = this.parent;
                    if (this.DURATION) {
                        (() => __awaiter(this, void 0, void 0, function* () {
                            parent.templateContainer.controller && (yield parent.templateContainer.controller.destroy());
                            parent.childrenShownChanger = { timer: window.setTimeout(() => !parent.isDestroyed ? parent.childrenShown++ : null, duration), startAt: new Date().getTime(), endAt: new Date().getTime() + duration };
                            const controllerContext = (parent.templateContext && parent.templateContext.controller) || {};
                            parent.templateContainer.controller = TemplateOperators.createTemplate(parent, Object.assign({ type: 'container' }, controllerContext), parent.methods, parent.componentAttribute, -1);
                        }))();
                    }
                    else {
                        clearTimeout(parent.childrenShownChanger.timer);
                        const timerViewers = this.ROOT.tree.filter(branch => {
                            if (branch instanceof ContainerTemplate && 'timerViewer' in branch.behaviorInstances && branch.behaviorInstances.timerViewer.options.target) {
                                return parent.id === branch.behaviorInstances.timerViewer.options.target;
                            }
                            else {
                                return false;
                            }
                        });
                        timerViewers.forEach(item => clearTimeout(item.behaviorInstances.timerViewer.timerChanger.timer));
                    }
                }
            }
        }
    }
    setStyles(val, save = true) {
        if (!this.ISDESTROYED) {
            save && this.saveContext('styles', Object.assign({}, (this.TEMPLATECONTEXT.styles || {}), val));
            const styleList = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
            this.TEMPLATEDATACONTEXT.styles = Object.assign({}, (this.TEMPLATEDATACONTEXT.styles || {}), styleList);
            const styles = Object.entries(styleList);
            styles.forEach(([key, value]) => {
                if (key in this.styles) {
                    this.styles[key] = (['string', 'number'].includes(typeof value)) ? `${value}` : undefined;
                }
                if (key === 'importantStyles') {
                    for (const [propertyName, propertyValue] of Object.entries(styleList.importantStyles)) {
                        this.styles.setProperty(propertyName, propertyValue, 'important');
                    }
                }
            });
        }
    }
    setTarget(val) {
        if (!this.ISDESTROYED) {
            this.saveContext('target', Object.assign({}, (this.TEMPLATECONTEXT.target || {}), val));
            const targetAttributes = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
            this.TEMPLATEDATACONTEXT.target = Object.assign({}, (this.TEMPLATEDATACONTEXT.target || {}), targetAttributes);
            const attributes = Object.entries(targetAttributes);
            attributes.forEach(([key, value], index) => {
                if (key in this.target) {
                    if (typeof this.target[key] !== 'function') {
                        if (this.checkObject(value)) {
                            this.setObjects(this.target[key], value);
                        }
                        else {
                            this.target[key] = value;
                        }
                    }
                    else {
                        this.target.dispatchEvent(new CustomEvent(key, { detail: value }));
                    }
                }
            });
        }
    }
}
export class ContainerTemplate extends Template {
    constructor(parent, templateContext, methods, tag, componentAttribute, rowIndex = 0, templateContainer = {}, type = 'container') {
        super(parent, templateContext, methods, tag, componentAttribute, rowIndex, Object.assign({ children: [] }, templateContainer), templateContext.type || type);
        this.CONTAINERTEMPLATEEVENTS = {
            childrenReady: new BehaviorSubject({ status: true, context: undefined }),
            childrenDestroyed: new Subject(),
            rowAdded: new Subject()
        };
        this.ROWS = [];
        this.appendChild = (child, methods = {}) => {
            this.ROWS[this.children.length] = child;
            return TemplateOperators.createTemplate(this, child, Object.assign({}, this.METHODS, methods), this.COMPONENTATTRIBUTE, this.children.length);
        };
        this.destroyChildren = (children) => new Promise(resolve => {
            children === undefined && (children = this.children);
            if (!this.ISDESTROYED && children && children.length > 0) {
                const progress = Array.from({ length: children.length }, () => false);
                children.forEach((item, index) => __awaiter(this, void 0, void 0, function* () {
                    yield item.destroy();
                    progress[index] = true;
                    if (this.ISDESTROYED === false) {
                        if (progress.every(elm => elm === true)) {
                            this.events.childrenDestroyed.next();
                            resolve();
                        }
                    }
                    else {
                        resolve();
                    }
                }));
            }
            else {
                resolve();
            }
        });
        if (templateContext.node && templateContext.node.element instanceof HTMLElement) {
            const rowList = [];
            Array.from(templateContext.node.element.children || []).forEach((node, idx) => {
                const attributes = Array.from(node.attributes).reduce((attr, { name, value }) => (attr[name] = value, attr), {});
                const propertyKeys = Object.keys(attributes).filter(attr => attr.match(/^template-.*/g) !== null);
                const properties = propertyKeys.reduce((ctx, key) => {
                    ['name', 'type'].includes(key.slice(9)) && (ctx[key.slice(9)] = attributes[key]);
                    return ctx;
                }, {});
                const context = Object.assign({ type: 'container', attributes, node: { element: node, removable: templateContext.node.removable } }, properties);
                TemplateOperators.createTemplate(this, context, this.METHODS, this.COMPONENTATTRIBUTE, idx);
                rowList.push(context);
            });
            this.TEMPLATEDATACONTEXT.rows = rowList;
            this.TEMPLATECONTEXT.rows = rowList;
            this.ROWS = rowList;
        }
        if ((templateContext.type || type) === 'container') {
            const restrictions = [];
            parent instanceof IterableTemplate && restrictions.push('duration');
            this.loadTemplate(templateContext, restrictions);
            this.events.ready.next({ template: this, type: templateContext.type || type });
        }
    }
    // READONLY
    /** Retorna la información almacenada en las propiedad "properties", "dataContext" y "methods" de la plantilla, de su arbol de padres y de su arbol de hijos */
    get propertyTree() {
        const properties = super.propertyTree;
        if (this.children.length > 0) {
            properties.getChildrenTree = () => this.childrenTree.reduce((prop, child) => (Object.assign({}, prop, { [child.id]: child.propertyTree })), {});
            properties.getChildren = () => this.children.map(child => child.propertyTree);
        }
        else {
            properties.getChildren = () => [];
            properties.getChildrenTree = () => ({});
        }
        return properties;
    }
    get children() { return !this.ISDESTROYED && this.TEMPLATECONTAINER ? this.TEMPLATECONTAINER.children : undefined; }
    get childrenTree() {
        if (!this.ISDESTROYED) {
            const getChildren = (children) => {
                return children.reduce((list, child) => {
                    return [...list, child, ...('children' in child ? getChildren(child.children) : [])];
                }, []);
            };
            return getChildren(this.children);
        }
        else {
            return undefined;
        }
    }
    // GETTERS
    get events() { return !this.ISDESTROYED ? Object.assign({}, super.events, this.CONTAINERTEMPLATEEVENTS) : undefined; }
    get rows() { return !this.ISDESTROYED ? this.ROWS : undefined; }
    set rows(val) {
        if (!this.ISDESTROYED && Array.isArray(val)) {
            (() => __awaiter(this, void 0, void 0, function* () {
                const currentEvent = this.events.childrenReady.value;
                currentEvent.status === false && (yield new Promise(resolve => this.events.childrenReady.pipe(first((event) => event.status === true && event.context === currentEvent.context)).subscribe(() => resolve())));
                this.events.childrenReady.next({ status: false, context: val });
                this.saveContext('rows', val, val);
                this.ROWS = val;
                this.children.length > 0 && (yield this.destroyChildren(this.TEMPLATECONTAINER.children));
                const progress = Array.from({ length: val.length }, () => false);
                progress.length === 0 && this.events.childrenReady.next({ status: true, context: val });
                val.forEach((row, idx) => __awaiter(this, void 0, void 0, function* () {
                    const child = TemplateOperators.createTemplate(this, row, this.METHODS, this.COMPONENTATTRIBUTE, idx);
                    child instanceof ContainerTemplate && child.rows && child.rows.length > 0 && (yield new Promise(resolve => child.events.childrenReady.pipe(first((event) => event.status === true)).subscribe(() => resolve())));
                    progress[idx] = true;
                    progress.every(status => status === true) && this.events.childrenReady.next({ status: true, context: val });
                }));
            }))();
        }
    }
    get dataContext() { return !this.ISDESTROYED ? super.dataContext : undefined; }
    set dataContext(val) {
        if (!this.ISDESTROYED) {
            super.dataContext = val;
            this.childrenTree.forEach(child => child.events.propertyChanges.next());
        }
    }
    get properties() { return !this.ISDESTROYED ? super.properties : undefined; }
    set properties(val) {
        if (!this.ISDESTROYED) {
            super.properties = val;
            this.childrenTree.forEach(child => child.events.propertyChanges.next());
        }
    }
    childrenContextTree(rowList = this.ROWS) {
        return !this.ISDESTROYED ? TemplateOperators.childrenContextTree(rowList) : undefined;
    }
    loadTemplate(context, restrict = []) {
        if (!this.ISDESTROYED && ![null, undefined].includes(context)) {
            super.loadTemplate(context, restrict);
            if ('rows' in context && (!restrict.includes('rows'))) {
                this.rows = context.rows;
            }
        }
    }
    /**
     * Añade un elemento a la plantilla
     * @param context Elemento a añadir: Plantilla o contexto de plantilla
     * @param replace Si es verdadero se reemplazara el contenido de la propiedad ROWS en la posición especificada
     * @param index Especifica la posición de la plantilla en donde se añadirá el elemento
     * @returns Elemento añadido
     */
    push(context, replace = false, index) {
        index === undefined && (index = this.children.length - 1);
        const template = context instanceof Template ? context : TemplateOperators.createTemplate(undefined, context, this.METHODS, this.COMPONENTATTRIBUTE, -2);
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
    destroy() {
        const parentDestroy = super.destroy;
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            if (!this.ISDESTROYED) {
                Object.values(this.CONTAINERTEMPLATEEVENTS).forEach(event => event.complete());
                if (this.parent instanceof IterableTemplate && !this.parent.isDestroyed && this.parent.templateContainer.controller === this) {
                    this.parent.templateContainer.controller = undefined;
                }
                yield parentDestroy.call(this);
            }
            resolve();
        }));
    }
}
export class IterableTemplate extends ContainerTemplate {
    constructor(parent, templateContext, methods, tag, componentAttribute, rowIndex = 0) {
        super(parent, templateContext, methods, tag, componentAttribute, rowIndex, { controller: undefined }, 'iterable');
        this.ITERABLETEMPLATEEVENTS = { childrenShownChanges: new Subject() };
        this.CHILDRENSHOWNCHANGER = { timer: 0, startAt: 0, endAt: 0 };
        this.CHILDRENLENGTH = 1;
        this.CHILDRENSHOWN = 0;
        const restrictions = ['childrenShown'];
        parent instanceof IterableTemplate && restrictions.push('duration');
        this.loadTemplate(templateContext, restrictions);
        this.events.ready.next({ template: this, type: 'iterable' });
    }
    // READONLY
    /** Retorna la información almacenada en las propiedad "properties", "dataContext" y "methods" de la plantilla, de su arbol de padres, de su arbol de hijos y el arbol del controlador */
    get propertyTree() {
        const properties = super.propertyTree;
        properties.getController = this.controller instanceof Template ? (() => this.controller.propertyTree) : (() => undefined);
        return properties;
    }
    /** Retorna el arbol de hijos, además del arbol del controlador */
    get childrenTree() {
        if (!this.ISDESTROYED) {
            const childrenTree = super.childrenTree;
            const controllerTree = childrenTree.filter(template => template instanceof IterableTemplate)
                .reduce((response, template) => {
                template.controller instanceof ContainerTemplate && response.push(...template.controller.childrenTree);
                template.controller instanceof Template && response.push(template.controller);
                return response;
            }, []);
            return [...childrenTree, ...controllerTree];
        }
        else {
            return undefined;
        }
    }
    /** Retorna la plantilla del controlador */
    get controller() { return !this.ISDESTROYED && this.TEMPLATECONTAINER ? this.TEMPLATECONTAINER.controller : undefined; }
    // GETTERS
    get events() { return !this.ISDESTROYED ? Object.assign({}, super.events, this.ITERABLETEMPLATEEVENTS) : undefined; }
    // GETTERS AND SETTERS
    get dataContext() { return !this.ISDESTROYED ? super.dataContext : undefined; }
    set dataContext(val) {
        if (!this.ISDESTROYED) {
            super.dataContext = val;
            this.controller instanceof Template && !this.controller.isDestroyed && this.controller.events.propertyChanges.next();
        }
    }
    get properties() { return !this.ISDESTROYED ? super.properties : undefined; }
    set properties(val) {
        if (!this.ISDESTROYED) {
            super.properties = val;
            this.controller instanceof Template && !this.controller.isDestroyed && this.controller.events.propertyChanges.next();
        }
    }
    get childrenShownChanger() { return !this.ISDESTROYED ? this.CHILDRENSHOWNCHANGER : undefined; }
    set childrenShownChanger(val) {
        if (!this.ISDESTROYED) {
            clearTimeout(this.CHILDRENSHOWNCHANGER.timer);
            this.CHILDRENSHOWNCHANGER = val;
        }
    }
    get rows() { return super.rows; }
    set rows(val) {
        if (!this.ISDESTROYED && Array.isArray(val)) {
            (() => __awaiter(this, void 0, void 0, function* () {
                const currentEvent = this.events.childrenReady.value;
                currentEvent.status === false && (yield new Promise(resolve => this.events.childrenReady.pipe(first((event) => event.status === true && event.context === currentEvent.context)).subscribe(() => resolve())));
                this.events.childrenReady.next({ status: false, context: val });
                this.saveContext('rows', val, val);
                this.ROWS = val;
                yield this.destroyChildren();
                this.setChildrenShown(![null, undefined].includes(this.TEMPLATECONTEXT.childrenShown) ? this.TEMPLATECONTEXT.childrenShown : this.CHILDRENSHOWN);
                this.events.childrenReady.next({ status: true, context: val });
            }))();
        }
    }
    get childrenLength() { return !this.ISDESTROYED ? this.CHILDRENLENGTH : undefined; }
    set childrenLength(val) {
        this.saveContext('childrenLength', val);
        const childrenLength = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
        this.CHILDRENLENGTH = childrenLength > 0 ? childrenLength : 1;
        this.TEMPLATEDATACONTEXT.childrenLength = this.CHILDRENLENGTH;
        this.childrenShown = this.CHILDRENSHOWN;
    }
    get childrenShown() { return !this.ISDESTROYED ? this.CHILDRENSHOWN : undefined; }
    set childrenShown(val) { !this.ISDESTROYED && this.setChildrenShown(val); }
    /**
     * Añade un elemento a la plantilla y actualiza los elementos mostrados
     * Para que el contenido de la plantilla cambie, actualice la propiedad childrenShown
     * @param context Elemento a añadir: Plantilla o contexto de plantilla
     * @param replace Si es verdadero se reemplazara el contenido de la propiedad ROWS en la posición especificada
     * @param index Especifica la posición de la plantilla en donde se añadirá el elemento
     * @returns undefined
     */
    push(context, replace = false, index) {
        index === undefined && (index = this.children.length - 1);
        const template = context instanceof Template ? Object.assign({}, context.templateContext, { node: {
                element: context.target,
                removable: 'node' in context.templateContext ? ('removable' in context.templateContext.node ? context.templateContext.node.removable : true) : true
            } }) : context;
        this.ROWS.splice(index, +replace, template);
        this.templateDataContext.rows = this.ROWS;
        this.templateContext.rows = this.ROWS;
        this.children.forEach(child => child.reIndex());
        index >= this.properties.startAt && index < this.properties.endAt && (this.childrenShown = this.CHILDRENSHOWN);
        !('startAt' in this.properties) && (this.childrenShown = this.CHILDRENSHOWN);
        this.events.rowAdded.next(index);
        return undefined;
    }
    childrenContextTree(rowList = this.ROWS) {
        if (!this.ISDESTROYED) {
            const childrenTree = super.childrenContextTree(rowList);
            const controllerTree = childrenTree.filter((context) => context.type === 'iterable')
                .reduce((response, context) => {
                if ('controller' in context) {
                    response.push(context.controller);
                    'rows' in context.controller && response.push(...this.childrenContextTree(context.controller.rows));
                }
                return response;
            }, []);
            return [...childrenTree, ...controllerTree];
        }
        else {
            return undefined;
        }
    }
    loadTemplate(context, restrict = []) {
        if (!this.ISDESTROYED && ![null, undefined].includes(context)) {
            super.loadTemplate(context, restrict);
            if ('childrenShown' in context && (!restrict.includes('childrenShown'))) {
                this.childrenShown = context.childrenShown;
            }
            if ('controller' in context) {
                this.saveContext('controller', context.controller, context.controller);
                this.controller && this.controller.loadTemplate(context.controller, []);
            }
            const properties = ['childrenLength'];
            properties.forEach(item => item in context && !restrict.includes(item) && (this[item] = context[item]));
        }
    }
    destroy() {
        const parentDestroy = super.destroy;
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            if (!this.ISDESTROYED) {
                Object.values(this.ITERABLETEMPLATEEVENTS).forEach(event => event.complete());
                clearTimeout(this.CHILDRENSHOWNCHANGER.timer);
                yield parentDestroy.call(this);
            }
            resolve();
        }));
    }
    setChildrenShown(index) {
        if (!this.ISDESTROYED) {
            clearTimeout(this.childrenShownChanger.timer);
            const lastChild = this.CHILDRENSHOWN;
            this.saveContext('childrenShown', index);
            const childrenShown = +TemplateOperators.interpolateVariableIf(index, this.propertyTree);
            this.CHILDRENSHOWN = childrenShown < (this.ROWS.length / this.CHILDRENLENGTH) ? childrenShown : 0;
            this.TEMPLATEDATACONTEXT.childrenShown = this.CHILDRENSHOWN;
            (() => __awaiter(this, void 0, void 0, function* () {
                this.children && this.children.length > 0 && (yield this.destroyChildren());
                if (!this.ISDESTROYED) {
                    const startAt = !this.ISDESTROYED ? (this.CHILDRENSHOWN * this.CHILDRENLENGTH) : undefined;
                    const nextChildren = !this.ISDESTROYED ? this.ROWS.slice(startAt, startAt + this.CHILDRENLENGTH) : [];
                    const childrenReference = nextChildren.map((nextChild, idx) => TemplateOperators.createTemplate(this, nextChild, this.METHODS, this.COMPONENTATTRIBUTE, startAt + idx));
                    const duration = nextChildren.reduce((prev, curr) => {
                        return prev === undefined && curr.duration === undefined ? undefined :
                            prev === undefined ? curr.duration : curr.duration > prev ? curr.duration : prev;
                    }, undefined);
                    if (duration === undefined) {
                        this.templateContainer.controller = TemplateOperators.createTemplate(this, Object.assign({ type: 'container' }, (this.TEMPLATECONTEXT.controller || {})), this.METHODS, this.COMPONENTATTRIBUTE, -1);
                    }
                    else {
                        childrenReference[0].loadTemplate({ duration });
                    }
                    const properties = {
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
            }))();
        }
    }
}
export class ElementTemplate extends Template {
    constructor(parent, templateContext, methods, tag, componentAttribute, rowIndex = 0) {
        super(parent, templateContext, methods, tag, componentAttribute, rowIndex, {}, 'element');
        const restrictions = [];
        parent instanceof IterableTemplate && restrictions.push('duration');
        if (templateContext.type === 'element') {
            this.loadTemplate(templateContext, restrictions);
            this.events.ready.next({ template: this, type: 'element' });
        }
    }
    get text() { return !this.ISDESTROYED && this.target ? this.target.innerHTML : undefined; }
    set text(val) {
        if (!this.ISDESTROYED && this.target) {
            this.saveContext('text', val);
            this.target.innerHTML = TemplateOperators.interpolateVariableIf(val, this.propertyTree);
            this.TEMPLATEDATACONTEXT.text = this.target.innerHTML;
        }
    }
    loadTemplate(context, restrict = []) {
        if (!this.ISDESTROYED && ![null, undefined].includes(context)) {
            super.loadTemplate(context, restrict);
            if ('text' in context && this.target && this instanceof ElementTemplate) {
                this.text = context.text;
            }
        }
    }
    destroy() { return super.destroy(); }
}
class IterableControllerBehavior {
    constructor(template, options) {
        this.template = template;
        this.options = options;
        this.destroy = () => new Promise(resolve => resolve());
        this.init();
    }
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
                if (parent instanceof IterableTemplate) {
                    parent.childrenShown++;
                }
            };
            const getElement = () => {
                const parent = getParent();
                if (parent instanceof IterableTemplate) {
                    if (this.options.childrenShown in parent.rows) {
                        if (this.options.allowReload === true || this.options.childrenShown !== parent.childrenShown) {
                            parent.childrenShown = this.options.childrenShown;
                        }
                    }
                    else {
                        console.warn(`index ${this.options.childrenShown} doesn't exists`);
                    }
                }
            };
            switch (this.options.action) {
                case 'return':
                    this.template.target.addEventListener('click', getPreviousElement);
                    break;
                case 'advance':
                    this.template.target.addEventListener('click', getNextElement);
                    break;
                case 'trigger':
                    let controlParent = getParent();
                    if (controlParent instanceof IterableTemplate) {
                        if ('childrenShown' in this.options && controlParent.childrenShown === this.options.childrenShown && 'templateContextActive' in this.options) {
                            this.template.loadTemplate(this.options.templateContextActive, []);
                        }
                    }
                    else {
                        this.template.root.branch.pipe(first((branch) => branch.id === this.options.target)).subscribe({
                            next: (branch) => {
                                controlParent = branch;
                                if (controlParent instanceof IterableTemplate && 'childrenShown' in this.options && controlParent.childrenShown === this.options.childrenShown && 'templateContextActive' in this.options) {
                                    this.template.loadTemplate(this.options.templateContextActive, []);
                                }
                            }
                        });
                    }
                    this.template.target.addEventListener('click', getElement);
                    break;
                default:
                    console.warn('iterable controller action is not defined');
                    break;
            }
        }
    }
}
class IterableTimerControllerBehavior {
    constructor(template, options) {
        this.template = template;
        this.options = options;
        this.destroy = () => new Promise(resolve => resolve());
        this.init();
    }
    init() {
        const parent = TemplateOperators.get(this.template.root.tree, this.options.target);
        if (parent instanceof IterableTemplate) {
            if ('templateContextActive' in this.options) {
                this.template.loadTemplate(this.options.templateContextActive, []);
            }
            const toggleDuration = (status) => {
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
                                    item.target.innerHTML = (() => {
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
                                    }
                                    else {
                                        parent.childrenShownChanger.endAt = 0;
                                    }
                                }
                            };
                            reference.timerChanger = {
                                timer: window.setTimeout(showDuration, pausedTime % 1000),
                                endAt: new Date().getTime() + (pausedTime % 1000),
                                startAt: new Date().getTime(),
                            };
                        });
                        TemplateOperators.getControllers(this.template.root.tree, parent, 'timerController').forEach((item) => {
                            if ('options' in item.behaviorInstances.timerController && 'templateContextActive' in item.behaviorInstances.timerController.options) {
                                item.loadTemplate(item.behaviorInstances.timerController.options.templateContextActive, []);
                            }
                        });
                    }
                    else {
                        clearTimeout(parent.childrenShownChanger.timer);
                        TemplateOperators.getControllers(this.template.root.tree, parent, 'timerViewer').forEach(item => clearTimeout(item.behaviorInstances.timerViewer.timerChanger.timer));
                        parent.childrenShownChanger.pausedAt = new Date().getTime();
                        TemplateOperators.getControllers(this.template.root.tree, parent, 'timerController').forEach((item) => {
                            if ('options' in item.behaviorInstances.timerController && 'templateContextInactive' in item.behaviorInstances.timerController.options) {
                                item.loadTemplate(item.behaviorInstances.timerController.options.templateContextInactive, []);
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
        }
        else {
            const branchInstance = this.template.root.branch.subscribe({
                next: branch => { if (branch.id === this.options.target) {
                    branchInstance.unsubscribe();
                    this.init();
                } }
            });
        }
    }
}
class IterableTimerViewerBehavior {
    constructor(template, options) {
        this.template = template;
        this.options = options;
        this.TIMERCHANGER = { timer: 0, startAt: 0, endAt: 0 };
        this.destroy = () => new Promise(resolve => (clearTimeout(this.TIMERCHANGER.timer), resolve()));
        this.init();
    }
    get timerChanger() { return this.TIMERCHANGER; }
    set timerChanger(val) {
        clearTimeout(this.TIMERCHANGER.timer);
        this.TIMERCHANGER = val;
    }
    init() {
        const parent = TemplateOperators.get(this.template.root.tree, this.options.target);
        if (parent instanceof IterableTemplate) {
            if (parent.childrenShownChanger.endAt > 0) {
                const showDuration = () => {
                    if (!this.template.isDestroyed) {
                        const remaining = parent.childrenShownChanger.endAt - new Date().getTime();
                        this.template.target.classList.add('before-active-content', 'after-active-content');
                        this.template.target.innerHTML = (() => {
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
                        }
                        else {
                            parent.childrenShownChanger.endAt = 0;
                        }
                    }
                };
                this.TIMERCHANGER = {
                    timer: window.setTimeout(showDuration, 1000),
                    endAt: new Date().getTime() + 1000,
                    startAt: new Date().getTime(),
                };
            }
        }
        else {
            const branchInstance = this.template.root.branch.subscribe(branch => {
                if (branch.id === this.options.target) {
                    branchInstance.unsubscribe();
                    this.init();
                }
            });
        }
    }
}
class IterableListPreviewBehavior {
    constructor(template, options) {
        this.template = template;
        this.options = options;
        this.childrenList = [];
        this.isDestroyed = false;
        this.destroy = () => new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            this.isDestroyed = true;
            const deleteFn = (index) => __awaiter(this, void 0, void 0, function* () {
                if (index in this.childrenList) {
                    yield this.childrenList[index].destroy();
                    this.childrenList.splice(index, 1);
                    deleteFn(index);
                }
            });
            yield deleteFn(0);
            resolve();
        }));
        this.init();
    }
    init() {
        const parent = TemplateOperators.get(this.template.root.tree, this.options.target);
        if (parent instanceof IterableTemplate && !this.isDestroyed) {
            if (this.template instanceof ContainerTemplate && !this.isDestroyed) {
                const templateContextInactive = 'templateContextInactive' in this.options ? this.options.templateContextInactive : {};
                const templateContextActive = this.options.templateContextActive;
                const templateContext = this.options.templateContext;
                const template = this.template;
                if (templateContextActive !== undefined) {
                    parent.events.childrenShownChanges.subscribe({
                        next: element => {
                            if (!template.isDestroyed && template.children.length > 0) {
                                template.children[element.currentChildrenShownIndex].loadTemplate(templateContextActive, []);
                                element.currentChildrenShownIndex !== element.lastChildrenShownIndex && template.children[element.lastChildrenShownIndex].loadTemplate(templateContextInactive, []);
                            }
                        }
                    });
                }
                const appenChild = (item, i) => {
                    if (!this.isDestroyed) {
                        const context = Object.assign({}, templateContext, (i === parent.childrenShown ? (templateContextActive || templateContextInactive) : templateContextInactive));
                        if ('changeIterableElement' in template.methods) {
                            console.warn('method "changeIterableElement" has been used, rename this');
                        }
                        const child = template.appendChild(Object.assign({}, context, { addEvents: [['click', { name: 'changeIterableElement' }]] }), {
                            changeIterableElement: (event) => {
                                const index = event.templateEvent.target.parent.children.indexOf(event.templateEvent.target);
                                index >= 0 ? parent.childrenShown = index : null;
                            }
                        });
                        this.childrenList.push(child);
                        child.properties = { rowReference: item, indexReference: i };
                    }
                };
                parent.events.rowAdded.subscribe({ next: index => appenChild(parent.rows[index], index) });
                parent.events.childrenReady.subscribe({
                    next: (ev) => __awaiter(this, void 0, void 0, function* () {
                        if (ev.status === true) {
                            template.children.length > 0 && (yield template.destroyChildren());
                            parent.rows.forEach((item, i) => appenChild(item, i));
                        }
                    })
                });
            }
        }
        else {
            !this.isDestroyed && this.template.root.branch.pipe(first((branch) => branch.id === this.options.target)).subscribe(() => this.init());
        }
    }
}
class IterableViewerBehavior {
    constructor(template, options) {
        this.template = template;
        this.options = options;
        this.destroy = () => new Promise((resolve) => __awaiter(this, void 0, void 0, function* () { return resolve(); }));
        this.init();
    }
    init() {
        const parent = TemplateOperators.get(this.template.root.tree, this.options.target);
        this.template.properties = {
            currentChildrenShownIndex: undefined,
            lastChildrenShownIndex: undefined,
            currentChildrenShown: undefined,
            length: 0, slice: 0, pages: 0,
            startAt: 0, endAt: 0
        };
        if (parent instanceof IterableTemplate) {
            parent.events.childrenShownChanges.subscribe(event => this.template.properties = event);
        }
    }
}
// BehaviorOptions
BehaviorOptions.use('timerController', IterableTimerControllerBehavior);
BehaviorOptions.use('iterableController', IterableControllerBehavior);
BehaviorOptions.use('timerViewer', IterableTimerViewerBehavior);
BehaviorOptions.use('listPreview', IterableListPreviewBehavior);
BehaviorOptions.use('iterableViewer', IterableViewerBehavior);
