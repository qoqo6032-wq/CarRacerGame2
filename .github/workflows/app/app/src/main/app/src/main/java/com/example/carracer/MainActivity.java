package com.example.carracer;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import android.widget.TextView;
import android.widget.LinearLayout;
import android.view.Gravity;
import android.graphics.Color;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Simple placeholder "game screen"
        LinearLayout layout = new LinearLayout(this);
        layout.setBackgroundColor(Color.DKGRAY);
        layout.setGravity(Gravity.CENTER);

        TextView tv = new TextView(this);
        tv.setText("🚗 Car Racer Game 🚦\n\n(Level system, money & cars coming soon!)");
        tv.setTextSize(22);
        tv.setTextColor(Color.WHITE);
        tv.setGravity(Gravity.CENTER);

        layout.addView(tv);
        setContentView(layout);
    }
}
