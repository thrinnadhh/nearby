import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AlertCircle } from 'lucide-react';
export default function ErrorBoundary({ children, error, }) {
    if (error) {
        return (_jsx("div", { className: "p-6 bg-red-50 border border-red-200 rounded-lg", children: _jsxs("div", { className: "flex items-start gap-4", children: [_jsx(AlertCircle, { className: "text-red-600 flex-shrink-0 mt-1", size: 24 }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-red-900", children: "Something went wrong" }), _jsx("p", { className: "text-sm text-red-700 mt-2", children: error.message || 'An unexpected error occurred' })] })] }) }));
    }
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=ErrorBoundary.js.map