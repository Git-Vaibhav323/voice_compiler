import { useState } from "react";
import {
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiInfo,
  FiX,
} from "react-icons/fi";

const TokenTable = ({ tokens }) => {
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterText, setFilterText] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-6 text-center">
        <FiInfo className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No tokens to display</p>
        <p className="text-slate-400 text-xs mt-1">
          Code will be tokenized during analysis
        </p>
      </div>
    );
  }

  const normalizedTokens = tokens.map((token, index) => {
    if (token.lexeme && token.token) {
      return token;
    }

    return {
      lexeme: token.value || token.lexeme || "",
      token: token.type || token.token || "UNKNOWN",
      attribute: token.attribute || token.line || null,
      _original: token,
      _index: index,
    };
  });

  const filteredTokens = normalizedTokens.filter((token) => {
    if (!token) return false;

    const lexeme = (token.lexeme || "").toString().toLowerCase();
    const tokenType = (token.token || "").toString().toLowerCase();
    const attribute = token.attribute
      ? token.attribute.toString().toLowerCase()
      : "";
    const searchLower = filterText.toLowerCase();

    return (
      lexeme.includes(searchLower) ||
      tokenType.includes(searchLower) ||
      attribute.includes(searchLower)
    );
  });

  const sortedTokens = [...filteredTokens].sort((a, b) => {
    if (!sortField) return 0;

    const aValue = (a[sortField] || "").toString();
    const bValue = (b[sortField] || "").toString();

    if (sortDirection === "asc") {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <FiChevronUp className="w-3 h-3 ml-1" />
    ) : (
      <FiChevronDown className="w-3 h-3 ml-1" />
    );
  };

  const clearFilters = () => {
    setFilterText("");
    setSortField(null);
    setSortDirection("asc");
  };

  const tokenTypes = [
    ...new Set(normalizedTokens.map((token) => token.token).filter(Boolean)),
  ];
  const hasFilters = filterText || sortField;

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-slate-700">
              Token Analysis
            </h3>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {filteredTokens.length} of {normalizedTokens.length} tokens
            </span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tokens..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              title="Show filters"
            >
              <FiFilter className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/*  Filters */}
        {showFilters && (
          <div className="mt-3 p-4 bg-white rounded-lg border border-slate-200">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Filter by token type
                </label>
                <select
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">All token types</option>
                  {tokenTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium cursor-pointer"
                >
                  <FiX className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-75">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                #
              </th>
              {["lexeme", "token", "attribute"].map((field) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center">
                    <span className="capitalize">
                      {field === "lexeme"
                        ? "Value"
                        : field === "token"
                        ? "Type"
                        : field}
                    </span>
                    {getSortIcon(field)}
                    {!getSortIcon(field) && (
                      <FiChevronUp className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedTokens.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-4 py-8 text-center text-slate-500 text-sm"
                >
                  <FiInfo className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                  No tokens match your search criteria
                </td>
              </tr>
            ) : (
              sortedTokens.map((token, index) => (
                <tr
                  key={token._index || index}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {token._index !== undefined ? token._index + 1 : index + 1}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <span
                        className="text-sm font-mono bg-slate-100 rounded px-2 py-1 font-medium text-slate-800 cursor-pointer hover:bg-slate-200 transition-colors"
                        onClick={() => copyToClipboard(token.lexeme)}
                        title="Click to copy"
                      >
                        {token.lexeme || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTokenTypeColor(
                        token.token
                      )}`}
                    >
                      {token.token || "UNKNOWN"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                    {token.attribute || (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sortedTokens.length > 0 && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          Showing {sortedTokens.length} token
          {sortedTokens.length !== 1 ? "s" : ""}
          {hasFilters && " (filtered)"}
          {sortField && ` • sorted by ${sortField} ${sortDirection}`}
        </div>
      )}
    </div>
  );
};

// token type colors
const getTokenTypeColor = (type) => {
  if (!type) return "bg-gray-100 text-gray-800";

  const typeUpper = type.toUpperCase();
  const colorMap = {
    IDENTIFIER: "bg-purple-100 text-purple-800",
    OPERATOR: "bg-blue-100 text-blue-800",
    NUMBER: "bg-green-100 text-green-800",
    LITERAL: "bg-green-100 text-green-800",
    KEYWORD: "bg-red-100 text-red-800",
    DELIMITER: "bg-yellow-100 text-yellow-800",
    ASSIGNMENT: "bg-indigo-100 text-indigo-800",
    COMMENT: "bg-gray-100 text-gray-600",
    STRING: "bg-pink-100 text-pink-800",
    PUNCTUATION: "bg-orange-100 text-orange-800",
  };

  for (const [key, value] of Object.entries(colorMap)) {
    if (typeUpper.includes(key)) {
      return value;
    }
  }

  return "bg-gray-100 text-gray-800";
};

export default TokenTable;
