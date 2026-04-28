import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function LoadingSkeleton({ count = 5 }) {
    return (_jsx("div", { className: "space-y-4", children: Array.from({ length: count }).map((_, i) => (_jsxs("div", { className: "bg-white rounded-lg p-6 space-y-4", children: [_jsx("div", { className: "h-6 bg-gray-200 rounded animate-pulse w-3/4" }), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded animate-pulse" }), _jsx("div", { className: "h-4 bg-gray-200 rounded animate-pulse w-5/6" })] })] }, i))) }));
}
//# sourceMappingURL=LoadingSkeleton.js.map