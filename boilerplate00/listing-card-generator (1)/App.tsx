import React, { useState } from 'react';
import { ListingCard } from './components/ListingCard';
import { parseListingData } from './services/geminiService';
import { ListingData, LoadingState } from './types';
import { Copy, Loader2, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [listingData, setListingData] = useState<ListingData | null>(null);
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGenerate = async () => {
    if (!inputText.trim()) return;

    setStatus(LoadingState.LOADING);
    setErrorMessage('');
    
    try {
      const data = await parseListingData(inputText);
      setListingData(data);
      setStatus(LoadingState.SUCCESS);
    } catch (error) {
      console.error(error);
      setStatus(LoadingState.ERROR);
      setErrorMessage("Failed to extract details. Please check the link or try pasting the description text directly.");
    }
  };

  const handleReset = () => {
    setListingData(null);
    setInputText('');
    setStatus(LoadingState.IDLE);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 font-sans">
      
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Real Estate Card Generator</h1>
        <p className="text-gray-500">Paste a Listing Link (Zillow, Redfin, etc.) or description.</p>
      </header>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Input Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <label htmlFor="listing-input" className="block text-sm font-semibold text-gray-700 mb-2">
            Listing URL or Text
          </label>
          <textarea
            id="listing-input"
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-none text-gray-700 bg-gray-50 placeholder-gray-400"
            placeholder="Paste a URL (e.g., https://www.apartments.com/...) or listing details here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={status === LoadingState.LOADING}
          />
          
          {status === LoadingState.ERROR && (
            <div className="mt-2 text-red-500 text-sm bg-red-50 p-2 rounded">
              {errorMessage}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={status === LoadingState.LOADING || !inputText.trim()}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg text-white font-bold transition-all
                ${status === LoadingState.LOADING || !inputText.trim() 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-black hover:bg-gray-800 shadow-md hover:shadow-lg'
                }`}
            >
              {status === LoadingState.LOADING ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Searching & Generating...
                </>
              ) : (
                'Generate Card'
              )}
            </button>
            
            {status !== LoadingState.IDLE && (
              <button
                onClick={handleReset}
                className="p-3 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-600 transition-colors"
                title="Reset"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Output Section */}
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          {listingData ? (
            <div className="animate-in fade-in zoom-in duration-300 w-full flex flex-col items-center">
              <div className="mb-4 text-sm text-gray-500 font-medium">Preview Result</div>
              <ListingCard data={listingData} />
              
              <p className="mt-6 text-xs text-gray-400 text-center max-w-xs">
                Tip: Data extracted via Gemini Search. Verify details before use.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-300 rounded-xl w-full p-10 bg-gray-50/50">
              <Copy className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-center font-medium">Your generated card will appear here</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default App;