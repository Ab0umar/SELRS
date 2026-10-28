package cc.selrs.ai;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AppIdentityTest {
    @Test
    public void installsAlongsideSelrsAndUsesBundledAiShell() throws Exception {
        Context app = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("cc.selrs.ai", app.getPackageName());
        try (InputStream stream = app.getAssets().open("capacitor.config.json")) {
            JSONObject config = new JSONObject(new String(stream.readAllBytes(), StandardCharsets.UTF_8));
            assertEquals(" SELRS-AI/1", config.getString("appendUserAgent"));
            assertFalse(config.getJSONObject("server").has("url"));
        }
    }
}
