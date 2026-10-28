package cc.selrs.app;

import android.app.Activity;
import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintJob;
import android.print.PrintManager;
import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {
    @PluginMethod
    public void printCurrentPage(PluginCall call) {
        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) {
            call.reject("WebView is not ready");
            return;
        }
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Android activity is unavailable");
            return;
        }

        final String jobName = call.getString("jobName", "SELRS Print");
        activity.runOnUiThread(() -> {
            try {
                Bridge currentBridge = getBridge();
                Context context = getContext();
                WebView webView = currentBridge == null ? null : currentBridge.getWebView();
                if (context == null || webView == null) {
                    call.reject("WebView is not ready");
                    return;
                }
                PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
                if (printManager == null) {
                    call.reject("Android print service unavailable");
                    return;
                }

                Toast.makeText(context, "Native print dialog opening...", Toast.LENGTH_SHORT).show();
                PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(jobName);
                PrintAttributes printAttributes = new PrintAttributes.Builder().build();
                PrintJob printJob = printManager.print(jobName, adapter, printAttributes);

                JSObject result = new JSObject();
                result.put("started", printJob != null);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Unable to start Android print flow", error);
            }
        });
    }
}
