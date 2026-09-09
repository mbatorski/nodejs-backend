import Route from "./Route";

export default class ParamRoute extends Route {
    _route!: string;

    setRoute(route: string) {
        this._route = route.startsWith("/") ? route.slice(1) : route;
        return this;
    }
}
